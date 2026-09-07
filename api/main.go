package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

var HEADSCALE_API_KEY = ""
var PORT = "8787"

const NUM_WORKERS = 10
const SCAN_PORT = 1080

type node struct {
	Online      bool     `json:"online"`
	IPAddresses []string `json:"ipAddresses"`
}

type candidate struct {
	IP string `json:"ip"`
}

func main() {
	loadEnvFile(".env")

	PORT = os.Getenv("PORT")
	if PORT == "" {
		PORT = "8787"
	}

	HEADSCALE_API_KEY = os.Getenv("HEADSCALE_API_KEY")
	if HEADSCALE_API_KEY == "" {
		log.Fatal("No headscale api key")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/nodes", handleNodes)

	srv := &http.Server{
		Addr:         ":" + PORT,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}

func handleNodes(w http.ResponseWriter, r *http.Request) {
	// --------------
	// Headscale nodes status api request
	// --------------
	req, err := http.NewRequest(
		"GET",
		"https://mesh.blueskyecuador.com/api/v1/node",
		nil,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+HEADSCALE_API_KEY)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "Headscale returned "+resp.Status, resp.StatusCode)
		return
	}

	var data struct {
		Nodes []node `json:"nodes"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		http.Error(w, "error parsing Headscale response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// --------------
	// Check for port :1080
	// --------------
	ipJobs := make(chan string)
	ipResults := make(chan candidate)

	var wg sync.WaitGroup

	// Start workers
	for range NUM_WORKERS {
		wg.Add(1)
		go isPortOpen(ipJobs, ipResults, &wg)
	}

	// Send jobs
	for _, n := range data.Nodes {
		if !n.Online || len(n.IPAddresses) == 0 {
			continue
		}

		ipv4 := n.IPAddresses[0]
		ipJobs <- ipv4
	}

	close(ipJobs)

	go func() {
		wg.Wait()
		close(ipResults)
	}()

	var result []candidate
	for candidate := range ipResults {
		result = append(result, candidate)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)

}

func isPortOpen(ipJobs <-chan string, ipResults chan<- candidate, wg *sync.WaitGroup) {
	defer wg.Done()

	for job := range ipJobs {

		timeout := time.Millisecond * 750

		conn, err := net.DialTimeout(
			"tcp",
			net.JoinHostPort(job, fmt.Sprintf("%d", SCAN_PORT)),
			timeout)
		if err != nil {
			continue
		}

		conn.Close()

		ipResults <- candidate{
			IP: job,
		}
	}

}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return // no .env file, just skip
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// don't override real environment variables if already set
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}
}
