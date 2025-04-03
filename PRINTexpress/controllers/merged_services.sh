[Unit]
Description=Merged PRINT Services (Express & React for Mapping and Network Tool)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=bmiller
WorkingDirectory=/home/print/print_map
EnvironmentFile=/home/print/print_map/print_express/.env
ExecStart=/bin/bash -c "\
  cd /home/print/print_map/print_express && node server.js > /var/log/print_map_express.log 2>&1 & \
  cd /home/print/print_map/public_html && serve -s build -p 4001 > /var/log/print_map_react.log 2>&1 & \
  cd /home/print/print_na/PRINTexpress_2 && /usr/bin/env node server.js --name 'PRINTexpress' > /var/log/print_na.log 2>&1 & \
  cd /home/print/print_na/REPRINT_2/build && serve -p 3998 > /var/log/print_react.log 2>&1 & \
  wait"
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target