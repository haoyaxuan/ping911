package web

import (
	"embed"
	"html/template"
	"io"
	"io/fs"
	"net/http"

	"github.com/haoyaxuan/ping911/v2/web/router"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

//go:embed assets
var assetsFS embed.FS

//go:embed html
var htmlFS embed.FS

type Template struct {
	common    *template.Template
	lby       *template.Template
	lightsail *template.Template
}

func parseTemplates(name, leftDelim, rightDelim string, patterns ...string) (*template.Template, error) {
	files := make([]string, 0)
	for _, pattern := range patterns {
		matches, err := fs.Glob(htmlFS, pattern)
		if err != nil {
			return nil, err
		}
		files = append(files, matches...)
	}

	t := template.New(name)
	if leftDelim != "" || rightDelim != "" {
		t.Delims(leftDelim, rightDelim)
	}
	if len(files) == 0 {
		return t, nil
	}
	return t.ParseFS(htmlFS, files...)
}

func (t *Template) Render(writer io.Writer, name string, data interface{}, context echo.Context) error {
	switch name {
	case "ping.html":
		return t.lby.ExecuteTemplate(writer, name, data)
	case "lightsail.html":
		return t.lightsail.ExecuteTemplate(writer, "index.html", data)
	}
	return t.common.ExecuteTemplate(writer, name, data)
}

func Init(e *echo.Echo) {
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodOptions},
		AllowHeaders: []string{"*"},
	}))
	e.Renderer = &Template{
		common:    template.Must(parseTemplates("common", "", "", "html/common/*.html")),
		lby:       template.Must(parseTemplates("ping.html", "[[[", "]]]", "html/ping/ping.html")),
		lightsail: template.Must(parseTemplates("lightsail.html", "[[[", "]]]", "html/lightsail/index.html")),
	}
	e.StaticFS("/assets", echo.MustSubFS(assetsFS, "assets"))
	router.Init(e)
}
