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

type Visa struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	LastName      string `json:"lastname"`
	ApplicationId string `json:"application_id"`
	Ip            string `json:"ip"`
	Date          string `json:"date"`
}

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
	    application_id TEXT NOT NULL,
		ip TEXT NOT NULL,
		date DATE NOT NULL
		)`)
	if err != nil {
		log.Fatal(err)
	}

	visaController := NewVisaController(db)
	renderingController := NewRenderingController(*dev, manifest)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", renderingController.Index)
	mux.HandleFunc("GET /visa", visaController.Index)
	mux.HandleFunc("POST /visa", visaController.Create)

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
