# Janus-Gate

## Browser extension builds

The extension is built from one source tree with two distribution targets:

- **Normal**: mesh proxy connection only
- **Visa**: includes the normal mesh features plus the VisaTracker integration

Build either target from `extension/`:

```bash
cd extension
npm run build:normal
npm run build:visa
```

The generated extension folders are:

```text
extension/dist/normal
extension/dist/visa
```

Load the desired folder as an unpacked extension in Chrome during development, or package that folder for release. `dist/` is generated and is not committed.

Shared mesh functionality lives in `extension/src/shared/`. VisaTracker-only files live in `extension/src/visa/`; the build script copies those files and adds the required permission only for the Visa target.

<br>
<br>

---

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
