.PHONY: setup train api web test

setup:
	pip install -r requirements.txt
	cd web && npm install

train:
	python ml/train.py

api:
	uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

web:
	cd web && npm run dev

test:
	pytest
