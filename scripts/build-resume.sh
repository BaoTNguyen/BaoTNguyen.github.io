#!/bin/sh
# Compiles resume/resume.tex into the PDF and preview image the /resume page serves.
# Needs TeX Live (pdflatex with fontawesome5) and poppler-utils (pdfinfo, pdftoppm).
set -e
cd "$(dirname "$0")/.."
mkdir -p .cache
pdflatex -interaction=nonstopmode -halt-on-error -output-directory=.cache resume/resume.tex > .cache/resume.log \
  || { tail -20 .cache/resume.log; exit 1; }
# House rules from career-ops' modes/_custom.md, as code (also checks one page). Nothing publishes unless they pass.
node scripts/resume-schema.mjs resume/resume.tex --pdf=.cache/resume.pdf
cp .cache/resume.pdf public/Bao_Nguyen_Resume.pdf
pdftoppm -png -r 200 -singlefile public/Bao_Nguyen_Resume.pdf public/resume
echo "resume built: public/Bao_Nguyen_Resume.pdf + public/resume.png"
