import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
	plugins: [react()],

	input: "src/main.tsx",

	// When another server owns the HTML instead of Vite.
	appType: "custom",

	server: {
		port: 5173,
		strictPort: true,
		cors: {
			// Page is served from :4040 but loads modules from :5173
			origin: "http://localhost:4040",
		},
	},

	build: {
		outDir: "dist",
		emptyOutDir: true,
		manifest: true,
	},
})
