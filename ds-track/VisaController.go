package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type VisaGet struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	LastName      string `json:"lastname"`
	DNI           string `json:"dni"`
	ApplicationId string `json:"application_id"`
	Ip            string `json:"ip"`
	Asesor        string `json:"asesor"`
	Date          string `json:"date"`
}

type VisaPost struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	LastName      string `json:"lastname"`
	ApplicationId string `json:"application_id"`
	Ip            string `json:"ip"`
	Asesor        string `json:"asesor"`
	Date          string `json:"date"`
}

type VisaPatch struct {
	ApplicationId string `json:"application_id"`
	DNI           string `json:"dni"`
}

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
		`SELECT id, name, lastname, COALESCE(dni, ''), application_id, ip, asesor, date 
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

	visas := []VisaGet{}

	for rows.Next() {
		var v VisaGet

		err := rows.Scan(
			&v.ID,
			&v.Name,
			&v.LastName,
			&v.DNI,
			&v.ApplicationId,
			&v.Ip,
			&v.Asesor,
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
		Data       []VisaGet `json:"data"`
		NextCursor *int      `json:"next_cursor"`
	}{
		Data:       visas,
		NextCursor: nextCursor,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (c *VisaController) Create(w http.ResponseWriter, r *http.Request) {
	var v VisaPost
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
	issuedDate := time.Now().Format("2006-01-02 15:04")
	v.Date = issuedDate

	res, err := c.db.Exec(
		"INSERT INTO visa( name, lastname, application_id, ip, asesor, date) VALUES(?, ?, ?, ?, ?, ?)",
		v.Name, v.LastName, v.ApplicationId, v.Ip, v.Asesor, v.Date)
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

func (c *VisaController) Patch(w http.ResponseWriter, r *http.Request) {
	var v VisaPatch
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		http.Error(w, "bad json", 400)
		return
	}

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

	if !exists {
		http.Error(w, "No dni provided", http.StatusAccepted)
		return
	}

	_, err = c.db.Exec(
		"UPDATE visa SET dni = ? where application_id = ?",
		v.DNI, v.ApplicationId)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(v)
}
