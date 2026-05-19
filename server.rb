require 'webrick'
require 'json'
require 'fileutils'

PORT = (ENV['PORT'] || 3000).to_i
DATA_DIR = File.expand_path('../data', __FILE__)
PUBLIC_DIR = File.expand_path('../public', __FILE__)

# Ensure data directory exists
FileUtils.mkdir_p(DATA_DIR)

# Auto-populate missing database files from defaults (critical for persistent disk mounts)
DEFAULTS_DIR = File.expand_path('../data_defaults', __FILE__)
if File.exist?(DEFAULTS_DIR)
  Dir.glob(File.join(DEFAULTS_DIR, '*.json')).each do |default_file|
    filename = File.basename(default_file)
    active_file = File.join(DATA_DIR, filename)
    if !File.exist?(active_file)
      puts "Initializing active database file: #{filename} from defaults..."
      FileUtils.cp(default_file, active_file)
    end
  end
end

# Helper to read JSON database
def read_db(filename)
  filepath = File.join(DATA_DIR, filename)
  return [] unless File.exist?(filepath)
  begin
    JSON.parse(File.read(filepath))
  rescue => e
    puts "Error reading #{filename}: #{e.message}"
    []
  end
end

# Helper to write JSON database
def write_db(filename, data)
  filepath = File.join(DATA_DIR, filename)
  begin
    File.write(filepath, JSON.pretty_generate(data))
    true
  rescue => e
    puts "Error writing #{filename}: #{e.message}"
    false
  end
end

# Helper to authenticate admin
def authorized?(request)
  # Simple token verification
  token = request['X-Admin-Token'] || request.cookies.find { |c| c.name == 'admin_token' }&.value
  token == 'admin-session-active'
end

# Custom API Servlet
class APIServlet < WEBrick::HTTPServlet::AbstractServlet
  def do_OPTIONS(request, response)
    response.status = 200
    set_cors_headers(response)
  end

  def do_GET(request, response)
    set_cors_headers(response)
    path = request.path

    case path
    when '/api/plans'
      plans = read_db('plans.json')
      # Non-admin requests only get active plans
      plans = plans.select { |p| p['active'] } unless authorized?(request)
      send_json(response, plans)

    when '/api/addons'
      addons = read_db('addons.json')
      # Non-admin requests only get active add-ons
      addons = addons.select { |a| a['active'] } unless authorized?(request)
      send_json(response, addons)

    when '/api/settings'
      settings = read_db('settings.json')
      # Hide adminPassword for non-admins
      unless authorized?(request)
        settings = settings.dup
        settings.delete('adminPassword')
      end
      send_json(response, settings)

    when '/api/leads'
      if authorized?(request)
        leads = read_db('leads.json')
        # Sort leads by createdAt descending
        leads = leads.sort_by { |l| l['createdAt'] || '' }.reverse
        send_json(response, leads)
      else
        send_error(response, 401, 'Unauthorized')
      end

    when '/api/auth/session'
      if authorized?(request)
        send_json(response, { authenticated: true })
      else
        send_json(response, { authenticated: false })
      end

    else
      send_error(response, 404, 'Endpoint Not Found')
    end
  end

  def do_POST(request, response)
    set_cors_headers(response)
    path = request.path
    body = parse_json_body(request)

    case path
    when '/api/auth/login'
      settings = read_db('settings.json')
      if body && body['password'] == settings['adminPassword']
        # Set a session cookie and return token
        cookie = WEBrick::Cookie.new('admin_token', 'admin-session-active')
        cookie.path = '/'
        cookie.max_age = 86400 # 24 hours
        response.cookies << cookie
        send_json(response, { token: 'admin-session-active', success: true, message: 'Logged in successfully' })
      else
        send_error(response, 401, 'Invalid password')
      end

    when '/api/auth/logout'
      cookie = WEBrick::Cookie.new('admin_token', '')
      cookie.path = '/'
      cookie.max_age = -1
      response.cookies << cookie
      send_json(response, { success: true, message: 'Logged out successfully' })

    when '/api/leads'
      # Submit Lead (Public)
      if body.nil? || body['name'].to_s.strip.empty? || body['email'].to_s.strip.empty?
        return send_error(response, 400, 'Name and Email are required')
      end

      leads = read_db('leads.json')
      new_lead = {
        'id' => "lead-#{Time.now.to_i}-#{rand(1000..9999)}",
        'name' => body['name'],
        'email' => body['email'],
        'phone' => body['phone'] || '',
        'businessName' => body['businessName'] || '',
        'selectedPlan' => body['selectedPlan'],
        'selectedAddOns' => body['selectedAddOns'] || [],
        'finalPrice' => body['finalPrice'].to_i,
        'message' => body['message'] || '',
        'createdAt' => Time.now.utc.iso8601
      }
      leads << new_lead
      if write_db('leads.json', leads)
        send_json(response, { success: true, lead: new_lead })
      else
        send_error(response, 500, 'Database write failed')
      end

    when '/api/plans'
      # Create Plan (Admin Only)
      return send_error(response, 401, 'Unauthorized') unless authorized?(request)
      return send_error(response, 400, 'Invalid payload') if body.nil? || body['name'].to_s.strip.empty?

      plans = read_db('plans.json')
      # Generate slug-based ID
      id = body['name'].downcase.gsub(/[^a-z0-9]/, '-')
      id = "plan-#{Time.now.to_i}" if id.strip.empty? || plans.any? { |p| p['id'] == id }

      new_plan = {
        'id' => id,
        'name' => body['name'],
        'description' => body['description'] || '',
        'basePrice' => body['basePrice'].to_i,
        'featured' => !!body['featured'],
        'includedServices' => body['includedServices'] || [],
        'monthlyOutputs' => body['monthlyOutputs'] || [],
        'platformsIncluded' => body['platformsIncluded'].to_i,
        'vaHours' => body['vaHours'].to_i,
        'ctaText' => body['ctaText'] || 'Get Started',
        'active' => body['active'] != false
      }

      # If marked featured, unfeature others
      if new_plan['featured']
        plans.each { |p| p['featured'] = false }
      end

      plans << new_plan
      write_db('plans.json', plans)
      send_json(response, { success: true, plan: new_plan })

    when '/api/addons'
      # Create Add-on (Admin Only)
      return send_error(response, 401, 'Unauthorized') unless authorized?(request)
      return send_error(response, 400, 'Invalid payload') if body.nil? || body['name'].to_s.strip.empty?

      addons = read_db('addons.json')
      id = body['name'].downcase.gsub(/[^a-z0-9]/, '-')
      id = "addon-#{Time.now.to_i}" if id.strip.empty? || addons.any? { |a| a['id'] == id }

      new_addon = {
        'id' => id,
        'name' => body['name'],
        'description' => body['description'] || '',
        'price' => body['price'].to_i,
        'pricingType' => body['pricingType'] || 'per_item', # per_item, per_hour, per_month
        'active' => body['active'] != false
      }

      addons << new_addon
      write_db('addons.json', addons)
      send_json(response, { success: true, addon: new_addon })

    when '/api/settings'
      # Update Settings (Admin Only)
      return send_error(response, 401, 'Unauthorized') unless authorized?(request)
      return send_error(response, 400, 'Invalid payload') if body.nil?

      settings = read_db('settings.json')
      # Update editable fields
      %w[agencyName contactEmail contactPhone currency activePlanFeaturedLabel].each do |field|
        settings[field] = body[field] if body.key?(field)
      end

      # Special check for password change
      if body['newPassword'] && !body['newPassword'].to_s.strip.empty?
        settings['adminPassword'] = body['newPassword']
      end

      write_db('settings.json', settings)
      # Do not return the password in response
      response_data = settings.dup
      response_data.delete('adminPassword')
      send_json(response, { success: true, settings: response_data })

    else
      send_error(response, 404, 'Endpoint Not Found')
    end
  end

  def do_PUT(request, response)
    set_cors_headers(response)
    path = request.path
    body = parse_json_body(request)

    return send_error(response, 401, 'Unauthorized') unless authorized?(request)
    return send_error(response, 400, 'Invalid payload') if body.nil? || body['id'].to_s.strip.empty?

    case path
    when '/api/plans'
      plans = read_db('plans.json')
      idx = plans.find_index { |p| p['id'] == body['id'] }
      return send_error(response, 404, 'Plan not found') if idx.nil?

      # If marked featured, unfeature others
      if body['featured']
        plans.each { |p| p['featured'] = false }
      end

      updated_plan = plans[idx].merge({
        'name' => body['name'] || plans[idx]['name'],
        'description' => body['description'] || plans[idx]['description'],
        'basePrice' => body['basePrice'].nil? ? plans[idx]['basePrice'] : body['basePrice'].to_i,
        'featured' => body['featured'].nil? ? plans[idx]['featured'] : !!body['featured'],
        'includedServices' => body['includedServices'] || plans[idx]['includedServices'],
        'monthlyOutputs' => body['monthlyOutputs'] || plans[idx]['monthlyOutputs'],
        'platformsIncluded' => body['platformsIncluded'].nil? ? plans[idx]['platformsIncluded'] : body['platformsIncluded'].to_i,
        'vaHours' => body['vaHours'].nil? ? plans[idx]['vaHours'] : body['vaHours'].to_i,
        'ctaText' => body['ctaText'] || plans[idx]['ctaText'],
        'active' => body['active'].nil? ? plans[idx]['active'] : body['active'] != false
      })

      plans[idx] = updated_plan
      write_db('plans.json', plans)
      send_json(response, { success: true, plan: updated_plan })

    when '/api/addons'
      addons = read_db('addons.json')
      idx = addons.find_index { |a| a['id'] == body['id'] }
      return send_error(response, 404, 'Add-on not found') if idx.nil?

      updated_addon = addons[idx].merge({
        'name' => body['name'] || addons[idx]['name'],
        'description' => body['description'] || addons[idx]['description'],
        'price' => body['price'].nil? ? addons[idx]['price'] : body['price'].to_i,
        'pricingType' => body['pricingType'] || addons[idx]['pricingType'],
        'active' => body['active'].nil? ? addons[idx]['active'] : body['active'] != false
      })

      addons[idx] = updated_addon
      write_db('addons.json', addons)
      send_json(response, { success: true, addon: updated_addon })

    else
      send_error(response, 404, 'Endpoint Not Found')
    end
  end

  def do_DELETE(request, response)
    set_cors_headers(response)
    path = request.path
    
    return send_error(response, 401, 'Unauthorized') unless authorized?(request)
    
    # Parse query parameters for id
    uri = URI.parse(request.request_uri)
    params = CGI.parse(uri.query || '')
    id = params['id']&.first

    return send_error(response, 400, 'Missing id parameter') if id.nil? || id.strip.empty?

    case path
    when '/api/plans'
      plans = read_db('plans.json')
      idx = plans.find_index { |p| p['id'] == id }
      return send_error(response, 404, 'Plan not found') if idx.nil?

      plans.delete_at(idx)
      write_db('plans.json', plans)
      send_json(response, { success: true, message: 'Plan deleted successfully' })

    when '/api/addons'
      addons = read_db('addons.json')
      idx = addons.find_index { |a| a['id'] == id }
      return send_error(response, 404, 'Add-on not found') if idx.nil?

      addons.delete_at(idx)
      write_db('addons.json', addons)
      send_json(response, { success: true, message: 'Add-on deleted successfully' })

    else
      send_error(response, 404, 'Endpoint Not Found')
    end
  end

  private

  def set_cors_headers(response)
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Token, Authorization'
  end

  def send_json(response, data)
    response.status = 200
    response.content_type = 'application/json'
    response.body = JSON.generate(data)
  end

  def send_error(response, status, message)
    response.status = status
    response.content_type = 'application/json'
    response.body = JSON.generate({ error: message, success: false })
  end

  def parse_json_body(request)
    return nil if request.body.nil? || request.body.empty?
    begin
      JSON.parse(request.body)
    rescue => e
      puts "Error parsing request JSON: #{e.message}"
      nil
    end
  end
end

# Create server instance
server = WEBrick::HTTPServer.new(
  Port: PORT,
  BindAddress: '0.0.0.0',
  DocumentRoot: PUBLIC_DIR,
  AccessLog: [],
  Logger: WEBrick::Log.new(nil, WEBrick::BasicLog::WARN) # Silent, cleaner logs
)

# Set MIME types for files
server.config[:MimeTypes] ||= {}
server.config[:MimeTypes]['css'] = 'text/css'
server.config[:MimeTypes]['js'] = 'application/javascript'
server.config[:MimeTypes]['json'] = 'application/json'
server.config[:MimeTypes]['html'] = 'text/html'

# Mount API Servlet
server.mount '/api', APIServlet

# Graceful shutdown handler
trap 'INT' do
  server.shutdown
end

puts "=========================================================="
puts "  Antigravity Social Media Pricing App Backend Server"
puts "=========================================================="
puts "  * Static site served from: #{PUBLIC_DIR}"
puts "  * Database files stored in: #{DATA_DIR}"
puts "  * App is running at: http://localhost:#{PORT}"
puts "  * Admin Dashboard at: http://localhost:#{PORT}/admin/"
puts "  Press Ctrl+C to stop the server"
puts "=========================================================="

server.start
