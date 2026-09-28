# Janus-Gate

## API Service 

It communicates the extension available nodes in the mesh

<br>

### Install Process

Generate an `.env` file for the binary to read

```env
PORT=8787
HEADSCALE_API_KEY=<key>
```

Create a background service with systemd 

`/etc/systemd/system/janus-api.service`

```systemd
ini
[Unit]
Description=Janus API
After=network.target tailscaled.service

[Service]
Type=simple
WorkingDirectory=/home/<user>/janus-api
ExecStart=/home/<user>/janus-api/server
Restart=on-failure
RestartSec=5
User=<user>

[Install]
WantedBy=multi-user.target

```

<br>

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable janus-api
sudo systemctl start janus-api
sudo systemctl status janus-api
```
