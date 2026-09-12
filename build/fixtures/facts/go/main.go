package main

import (
	"net/http"

	"github.com/example/svc/router"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	v := viper.Default()
	c := cfg.Default()
	d := x.Default()
	router.Mount(r)
	http.ListenAndServe(":8080", r)
	_, _, _ = v, c, d
}

func flags(mux *http.ServeMux) {
	var verbose bool
	flag.BoolVar(&verbose, "verbose", false, "say more")
	mux.HandleFunc("GET /v1/me", me)
	req := &http.Request{Method: "GET"}
	_ = req
}

// Phase 261 item 4. A ROUTE IS NEVER AN ABSOLUTE URL, and `pathish` accepts
// one because the token carries a slash and no character outside its set. The
// entry's summary named the Go 1.22 pattern branch alone; the plain branch is
// affected too, which is why both are planted here and why the rule asks the
// refusal ONCE over the resolved target. The control is the
// `mux.HandleFunc("GET /v1/me", me)` above, which must keep reading a route.
// The second line still reads a `network.client` fact, because the URL
// argument branch fires on any callee: that is item 6's class 3, the one
// Phase 261 refused to close, and `rules-network.ts`'s header says why.
func absoluteURLDecoys(mux *http.ServeMux) {
	mux.HandleFunc("GET https://evil.example.com/abs", h)
	mux.HandleFunc("https://evil.example.com/plain", h)
}
