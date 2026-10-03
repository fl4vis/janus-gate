package main

import (
	"database/sql"
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"time"

	_ "modernc.org/sqlite"
)

var (
	db *sql.DB
)

//go:embed all:web/dist
var distEmbed embed.FS

func main() {
	dev := flag.Bool("dev", false, "run in dev mode")
	flag.Parse()

	var manifest ViteManifest
	if !*dev {
		var err error

		manifest, err = loadViteManifest()
		if err != nil {
			log.Fatal("failed to load vite manifest: ", err)
		}
	}

	var err error

	// Location
	_, err = time.LoadLocation("America/Guayaquil")
	if err != nil {
		log.Fatal("Failed to load timezone", err)
	}

	/*
	 * Sqlite
	 */
	db, err = sql.Open("sqlite", "app.db")
	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	// Create the table from Go too
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS visa (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		lastname TEXT NOT NULL,
		dni TEXT,
	    application_id TEXT NOT NULL,
		ip TEXT NOT NULL,
		asesor TEXT NOT NULL,
		date DATE NOT NULL
		)`)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(`
	CREATE INDEX IF NOT EXISTS idx_visa_application_id
	ON visa(application_id)
	`)
	if err != nil {
		log.Fatal(err)
	}

	// Server
	visaController := NewVisaController(db)
	renderingController := NewRenderingController(*dev, manifest)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", renderingController.Index)
	mux.HandleFunc("GET /visa", visaController.Index)
	mux.HandleFunc("POST /visa", visaController.Create)
	mux.HandleFunc("PATCH /visa", visaController.Patch)

	// Production assets
	if !*dev {
		dist, err := fs.Sub(distEmbed, "web/dist")
		if err != nil {
			log.Fatal(err)
		}

		log.Println("production mode")

		mux.Handle("/", http.FileServerFS(dist))
	}

	// Dev mode
	if *dev {
		log.Println("development mode")
		log.Println("Vite: http://localhost:5173")
	}

	log.Println("listening on :4040")
	log.Fatal(http.ListenAndServe(":4040", mux))
}
