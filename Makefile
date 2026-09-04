# Front door for the build. Everything real lives in scripts/build.py; this is
# the list of the things anyone actually types.
#
# `serve` renders the PDFs as well as the site, because a local preview with
# dead /downloads/ links is a preview that hides exactly the kind of breakage
# worth catching before a deploy.
#
# PYTHON prefers ./.venv. Homebrew and most current distro Pythons are
# PEP 668 "externally managed", so a bare `pip install -r requirements.txt`
# fails on a fresh machine; `make install` creates the venv and everything else
# then picks it up automatically. CI sets up its own interpreter and never has
# a .venv, so it falls through to python3 and installs normally.

VENV   := .venv
PYTHON := $(shell [ -x $(VENV)/bin/python ] && echo $(VENV)/bin/python || echo python3)

.DEFAULT_GOAL := help
.PHONY: help build pdf images serve clean install venv

help:
	@echo "make install  create .venv, install the Python deps and Playwright's Chromium"
	@echo "make build    render the site into dist/"
	@echo "make pdf      render the site and the three PDFs"
	@echo "make images   regenerate the OG card and the favicons (committed assets)"
	@echo "make serve    render everything, then serve dist/ on http://127.0.0.1:8788/"
	@echo "make clean    delete dist/"
	@echo ""
	@echo "using: $(PYTHON)"

build:
	$(PYTHON) scripts/build.py

pdf:
	$(PYTHON) scripts/build.py --pdf

images:
	$(PYTHON) scripts/render_images.py

serve:
	$(PYTHON) scripts/build.py --pdf --serve

clean:
	rm -rf dist

venv:
	python3 -m venv $(VENV)

install: venv
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/python -m pip install -r requirements.txt
	$(VENV)/bin/python -m playwright install chromium
