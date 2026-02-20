package main

import (
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	// CLI Flags
	jobFlag := flag.String("job", "", "Run a specific background job (e.g. 'daily') and exit")
	flag.Parse()

	// Initialize Database
	InitDB()

	// If job flag is set, run the job and exit
	if *jobFlag != "" {
		if *jobFlag == "daily" {
			log.Println("[Main] Running scheduled job: daily")
			RunDailyJob()
			log.Println("[Main] Job completed. Exiting.")
			os.Exit(0)
		} else {
			log.Fatalf("[Main] Unknown job: %s", *jobFlag)
		}
	}

	// Start Cron Job (Background ticker)
	StartCron()

	// Initialize Router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Routes
	r.Route("/api", func(r chi.Router) {
		// Public: health check
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("OK"))
		})

		// Protected: all other routes require Clerk authentication
		r.Group(func(r chi.Router) {
			r.Use(ClerkAuthMiddleware)

			r.Get("/problems", GetProblems)
			r.Get("/problems/today", GetTodaysFocus)
			r.Get("/problems/weights", GetAllWeights)
			r.Get("/problems/{id}", GetProblemByID)
			r.Get("/problems/{id}/weight", GetProblemWeight)
			r.Post("/problems", CreateProblem)
			r.Put("/problems/{id}", UpdateProblem)
			r.Delete("/problems/{id}", DeleteProblem)
			r.Post("/problems/{id}/revisit", MarkRevisited)
			r.Post("/problems/{id}/archive", ArchiveProblem)
			// Settings
			r.Get("/settings", GetSettings)
			r.Put("/settings", UpdateSettings)
			// Testing / Debugging
			r.Post("/test-email", TestEmail)
			r.Post("/admin/run-cron", RunCronAllUsers)
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
