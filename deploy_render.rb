require 'net/http'
require 'uri'
require 'json'

# BeatPulse Agency - Pure Ruby Render Deployer
# Automates the creation of a Web Service and attaches a Persistent Disk 
# using the Render REST API.

TOKEN_FILE = File.expand_path('../render_token.txt', __FILE__)
REPO_URL = 'https://github.com/mnawattoo/social-media-pricing-app'
SERVICE_NAME = 'social-media-pricing-app'

def load_token
  if File.exist?(TOKEN_FILE)
    File.read(TOKEN_FILE).strip
  else
    nil
  end
end

def main
  puts "=========================================================="
  puts "   🚀 BeatPulse Agency Render Deployment Automator"
  puts "=========================================================="

  token = load_token || ENV['RENDER_TOKEN']

  if token.nil? || token.empty?
    puts "⚠️ Render API key file 'render_token.txt' not found or empty."
    puts "To deploy directly, please enter your Render API Key."
    puts "You can generate one in your Render settings: https://dashboard.render.com/account"
    print "Render API Key: "
    token = gets&.strip

    if token.nil? || token.empty?
      puts "❌ Error: API Key is required to deploy. Aborting."
      exit 1
    end

    File.write(TOKEN_FILE, token)
    puts "✅ API Key saved locally to render_token.txt."
  else
    puts "🔑 Loaded Render API Key from render_token.txt"
  end

  # 1. Fetch Owner ID
  puts "\n1. Fetching Render Account Owners..."
  owners_uri = URI.parse("https://api.render.com/v1/owners?limit=20")
  owners_response = make_render_request(owners_uri, token, :get)

  if owners_response.code.to_i != 200
    puts "❌ Render API Access Failed! Response code: #{owners_response.code}"
    puts "Please check that your Render API Key is correct and active."
    File.delete(TOKEN_FILE) if File.exist?(TOKEN_FILE)
    exit 1
  end

  owners_data = JSON.parse(owners_response.body)
  if owners_data.empty?
    puts "❌ No workspaces or owner profiles found in your Render account."
    exit 1
  end

  # Select first owner/workspace
  owner = owners_data.first['owner']
  owner_id = owner['id']
  owner_name = owner['name']
  owner_email = owner['email']
  puts "✅ Authenticated successfully for workspace: #{owner_name} (#{owner_email}) | ID: #{owner_id}"

  # 2. Create Web Service
  puts "\n2. Deploying Web Service '#{SERVICE_NAME}'..."
  services_uri = URI.parse("https://api.render.com/v1/services")
  
  service_payload = {
    name: SERVICE_NAME,
    type: "web_service",
    ownerId: owner_id,
    repo: REPO_URL,
    branch: "main",
    serviceDetails: {
      env: "ruby",
      plan: "free",
      envSpecificDetails: {
        buildCommand: "echo 'No build step required'",
        startCommand: "ruby server.rb"
      }
    }
  }

  service_response = make_render_request(services_uri, token, :post, service_payload)
  
  service_id = nil
  live_url = nil
  is_already_in_use = false
  
  if service_response.code.to_i == 201
    service_data = JSON.parse(service_response.body)
    service_id = service_data['id']
    live_url = service_data['url']
    puts "✅ Web Service created successfully! Service ID: #{service_id}"
    puts "🌐 Live Site URL: #{live_url}"
  else
    # Check if the response suggests the service name is already in use
    begin
      err_body = JSON.parse(service_response.body)
      if err_body.is_a?(Hash) && err_body['message'] && err_body['message'].to_s.include?('already in use')
        is_already_in_use = true
      end
    rescue => e
      # Ignore parsing error for error body
    end
    
    if service_response.code.to_i == 409 || is_already_in_use
      puts "⚠️ Web Service '#{SERVICE_NAME}' already exists or has a name conflict."
      puts "Searching for your existing service ID on Render..."
      
      list_uri = URI.parse("https://api.render.com/v1/services?limit=100")
      list_response = make_render_request(list_uri, token, :get)
      
      if list_response.code.to_i == 200
        services_list = JSON.parse(list_response.body)
        existing_service = services_list.find { |s| s['service'] && s['service']['name'] == SERVICE_NAME }
        
        if existing_service
          service_id = existing_service['service']['id']
          live_url = existing_service['service']['url']
          puts "✅ Found existing Service ID: #{service_id}"
          puts "🌐 Live Site URL: #{live_url}"
        else
          puts "❌ Could not find a service named '#{SERVICE_NAME}' in your service list."
          puts "Response body: #{service_response.body}"
          exit 1
        end
      else
        puts "❌ Failed to fetch your services: #{list_response.body}"
        exit 1
      end
    else
      puts "❌ Failed to create Web Service. Render Response: #{service_response.body}"
      exit 1
    end
  end

  # 3. Attach Persistent Disk
  puts "\n3. Checking persistent disk requirements..."
  
  has_disk = false
  
  # Check if a disk is already attached by querying disks endpoint
  disks_uri = URI.parse("https://api.render.com/v1/disks?limit=100")
  disks_response = make_render_request(disks_uri, token, :get)
  
  if disks_response.code.to_i == 200
    begin
      disks_list = JSON.parse(disks_response.body)
      if disks_list.is_a?(Array)
        existing_disk = disks_list.find do |d|
          d_info = d['disk'] || d
          d_info.is_a?(Hash) && d_info['serviceId'] == service_id
        end
        has_disk = true if existing_disk
      end
    rescue => e
      puts "⚠️ Disk list parsing warning: #{e.message}"
    end
  end
  
  # Fallback to checking the service details if disk check fails or isn't conclusive
  if !has_disk
    details_uri = URI.parse("https://api.render.com/v1/services/#{service_id}")
    details_response = make_render_request(details_uri, token, :get)
    
    if details_response.code.to_i == 200
      begin
        service_details = JSON.parse(details_response.body)
        if service_details.is_a?(Hash)
          details = service_details['service'] || service_details
          if details.is_a?(Hash) && details['serviceDetails'].is_a?(Hash)
            has_disk = details['serviceDetails']['disk'] != nil
          end
        end
      rescue => e
        # Ignore fallback parsing error
      end
    end
  end

  if has_disk
    puts "✅ Persistent disk is already attached to this service."
  else
    puts "➕ Attaching 1 GB Persistent Volume mount to /opt/render/project/src/data..."
    attach_disk_uri = URI.parse("https://api.render.com/v1/disks")
    
    disk_payload = {
      name: "pricing-data",
      sizeGB: 1,
      mountPath: "/opt/render/project/src/data",
      serviceId: service_id
    }
    
    disk_response = make_render_request(attach_disk_uri, token, :post, disk_payload)
    
    if disk_response.code.to_i == 201
      puts "✅ Persistent disk successfully attached!"
      
      # 4. Trigger Redeployment to apply disk mounting
      puts "\n4. Triggering redeployment to mount disk..."
      deploy_uri = URI.parse("https://api.render.com/v1/services/#{service_id}/deploys")
      deploy_response = make_render_request(deploy_uri, token, :post, {})
      
      if deploy_response.code.to_i == 201
        puts "✅ Redeployment triggered successfully!"
      else
        puts "⚠️ Failed to automatically trigger redeployment: #{deploy_response.body}"
        puts "You may need to manually deploy the latest commit in your Render Dashboard."
      end
    elsif disk_response.code.to_i == 409
      puts "✅ Persistent disk is already attached or has a naming conflict."
    else
      puts "❌ Failed to attach persistent disk. Render Response: #{disk_response.body}"
      puts "Continuing deployment without custom persistent volume."
    end
  end

  puts "\n=========================================================="
  puts "   🎉 Render Deployment Automated Successfully!"
  puts "=========================================================="
  puts "  Your service is building in the cloud."
  puts "  👉 Dashboard: https://dashboard.render.com/web/#{service_id}"
  puts "  👉 Live URL:  #{live_url}"
  puts "=========================================================="
end

def make_render_request(uri, token, method, body = nil)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = (uri.scheme == 'https')

  request = case method
            when :get
              Net::HTTP::Get.new(uri.request_uri)
            when :post
              Net::HTTP::Post.new(uri.request_uri)
            end

  request['Authorization'] = "Bearer #{token}"
  request['Accept'] = 'application/json'
  
  if body
    request.body = JSON.generate(body)
    request['Content-Type'] = 'application/json'
  end

  begin
    http.request(request)
  rescue => e
    puts "Network connection error: #{e.message}"
    Struct.new(:code, :body).new(500, e.message)
  end
end

main if __FILE__ == $0
