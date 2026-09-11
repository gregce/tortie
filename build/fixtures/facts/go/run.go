package main

import (
	"errors"
	"os"
	"os/exec"
)

func run() error {
	exec.Command("git", "status")
	token := os.Getenv("APP_TOKEN")
	if token == "" {
		return errors.New("not found here")
	}
	app := &model.Application{ID: 1}
	_ = app
	panic("must not happen")
}
