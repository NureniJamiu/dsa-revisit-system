package main

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateProblemInput(t *testing.T) {
	cases := []struct {
		name    string
		title   string
		link    string
		wantErr bool
	}{
		{"valid input", "Two Sum", "https://leetcode.com/problems/two-sum", false},
		{"empty title", "", "https://leetcode.com/problems/two-sum", true},
		{"whitespace-only title", "   ", "https://leetcode.com/problems/two-sum", true},
		{"empty link", "Two Sum", "", true},
		{"whitespace-only link", "Two Sum", "   ", true},
		{"both empty", "", "", true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateProblemInput(c.title, c.link)
			if c.wantErr && err == nil {
				t.Error("expected an error, got nil")
			}
			if !c.wantErr && err != nil {
				t.Errorf("expected no error, got %v", err)
			}
		})
	}
}

func TestInternalError_DoesNotLeakUnderlyingError(t *testing.T) {
	rec := httptest.NewRecorder()
	sensitive := errors.New(`pq: relation "problems" violates constraint "fk_secret_internal_schema"`)

	internalError(rec, "TestContext", sensitive, "Failed to do the thing")

	if rec.Code != 500 {
		t.Errorf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "pq:") || strings.Contains(body, "fk_secret_internal_schema") {
		t.Errorf("response leaked internal error detail: %s", body)
	}
	if !strings.Contains(body, "Failed to do the thing") {
		t.Errorf("expected generic message in response, got: %s", body)
	}
}
