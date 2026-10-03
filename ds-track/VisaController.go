package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type VisaController struct {
	db       *sql.DB
	dev      bool
	manifest ViteManifest
}

func NewVisaController(db *sql.DB) *VisaController {
	return &VisaController{
		db: db,
	}
}

func (c *VisaController) Index(w http.ResponseWriter, r *http.Request) {
	cursor, _ := strconv.Atoi(r.URL.Query().Get("cursor"))
	date := r.URL.Query().Get("date")

	const LIMIT int = 20

	rows, err := c.db.Query(
		`SELECT id, name, lastname, application_id, ip, date 
		 FROM visa
		 WHERE id > ?
		 AND strftime('%Y-%m', date) = ?
		 ORDER BY id ASC
	     LIMIT ?
		`, cursor, date, LIMIT,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	visas := []Visa{}

	for rows.Next() {
		var v Visa

		err := rows.Scan(
			&v.ID,
			&v.Name,
			&v.LastName,
			&v.ApplicationId,
			&v.Ip,
			&v.Date,
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		visas = append(visas, v)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var nextCursor *int

	if len(visas) > 0 {
		lastID := visas[len(visas)-1].ID
		nextCursor = &lastID
	}

	response := struct {
		Data       []Visa `json:"data"`
		NextCursor *int   `json:"next_cursor"`
	}{
		Data:       visas,
		NextCursor: nextCursor,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (c *VisaController) Create(w http.ResponseWriter, r *http.Request) {
	var v Visa
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		http.Error(w, "bad json", 400)
		return
	}

	// AntiCorruption
	var exists bool

	err := c.db.QueryRow(
		`SELECT EXISTS(
			SELECT 1
			FROM visa
			WHERE application_id = ?)`,
		v.ApplicationId,
	).Scan(&exists)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "application_id already exists", http.StatusConflict)
		return
	}

	// Create if no application exists
	issuedDate := time.Now().Format("2006-01-02")
	v.Date = issuedDate

	res, err := c.db.Exec(
		"INSERT INTO visa( name, lastname, application_id, ip, date) VALUES(?, ?, ?, ?, ?)",
		v.Name, v.LastName, v.ApplicationId, v.Ip, v.Date)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	id, _ := res.LastInsertId()
	v.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(v)
}
