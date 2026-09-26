package main

import "encoding/json"

type ViteManifest map[string]ViteManifestEntry

type ViteManifestEntry struct {
	File    string   `json:"file"`
	CSS     []string `json:"css"`
	Imports []string `json:"imports"`
}

func loadViteManifest() (ViteManifest, error) {
	data, err := distEmbed.ReadFile("web/dist/.vite/manifest.json")
	if err != nil {
		return nil, err
	}

	var manifest ViteManifest

	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}

	return manifest, nil
}
