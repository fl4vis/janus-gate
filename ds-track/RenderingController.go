package main

import (
	"fmt"
	"net/http"
	"strings"
)

type RenderingController struct {
	dev      bool
	manifest ViteManifest
}

func NewRenderingController(dev bool, manifest ViteManifest) *RenderingController {
	return &RenderingController{
		dev:      dev,
		manifest: manifest,
	}
}

func (c *RenderingController) productionAssets() (string, string) {
	entry := c.manifest["src/main.tsx"]

	var head strings.Builder

	for _, css := range entry.CSS {
		fmt.Fprintf(
			&head,
			`<link rel="stylesheet" href="/%s">`,
			css,
		)
	}

	frontend := fmt.Sprintf(
		`<script type="module" src="/%s"></script>`,
		entry.File,
	)

	return head.String(), frontend
}

func (c *RenderingController) Index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	var frontend string
	var head string

	if c.dev {
		head = `
		<link
			rel="icon"
			type="image/svg+xml"
			href="http://localhost:5173/favicon.svg"
		>
		`
		frontend = `
		<script type="module">
			import RefreshRuntime from "http://localhost:5173/@react-refresh"

			RefreshRuntime.injectIntoGlobalHook(window)
			window.$RefreshReg$ = () => {}
			window.$RefreshSig$ = () => (type) => type
			window.__vite_plugin_react_preamble_installed__ = true
		</script>

		<script
			type="module"
			src="http://localhost:5173/@vite/client"
		></script>

		<script
			type="module"
			src="http://localhost:5173/src/main.tsx"
		></script>
		`
	} else {
		head, frontend = c.productionAssets()

		head += `
			<link
				rel="icon"
				type="image/svg+xml"
				href="/favicon.svg"
			>
		`
	}

	fmt.Fprintf(w, `
		<!doctype html>
		<html lang="en">

		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			%s
			<title>DS Track</title>
		</head>

		<body>

			<div id="root"></div>

			%s
		</body>

		</html>
	`, head, frontend)
}
