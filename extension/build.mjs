import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))
const source = join(root, "src")
const dist = join(root, "dist")
const target = process.argv[2]

if (!["normal", "visa"].includes(target)) {
	throw new Error("Usage: node build.mjs <normal|visa>")
}

const output = join(dist, target)

async function copySharedFiles() {
	await cp(join(source, "shared"), output, {
		recursive: true,
		filter: (path) => !["types", "jsconfig.json"].includes(basename(path)),
	})
}

async function buildVisa() {
	// Build Manifest
	const manifestPath = join(output, "manifest.json")
	const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
	manifest.permissions.push("webRequest")
	manifest.content_scripts = [
		{
			matches: ["https://ceac.state.gov/*"],
			js: ["content.js"],
		},
	]
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`)

	// Add capabilities to background.js
	const backgroundPath = join(output, "background.js")
	const [sharedBackground, visaBackground] = await Promise.all([
		readFile(backgroundPath, "utf8"),
		readFile(join(source, "visa", "visa-background.js"), "utf8"),
	])
	await writeFile(backgroundPath, `${sharedBackground.trimEnd()}\n\n${visaBackground}`)

	// Add VisaTracker url setting in options.html
	const optionsPath = join(output, "options", "options.html")
	const [optionsHtml, visaField] = await Promise.all([
		readFile(optionsPath, "utf8"),
		readFile(join(source, "visa", "options", "visa-field.html"), "utf8"),
	])
	await writeFile(
		optionsPath,
		optionsHtml
			.replace("<!-- VISA_OPTIONS -->", visaField.trimEnd())
			.replace("<!-- VISA_SCRIPTS -->", '<script src="./visa-options.js"></script>'),
	)

	// Add visa-options.js into /options
	await cp(join(source, "visa", "options", "visa-options.js"), join(output, "options", "visa-options.js"))
	await cp(join(source, "visa", "content.js"), join(output, "content.js"))
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await copySharedFiles()

if (target === "visa") {
	await buildVisa()
}

console.log(`Built ${target} extension: ${output}`)
