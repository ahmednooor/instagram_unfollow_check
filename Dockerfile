FROM python:onbuild

# Create app directory
RUN mkdir -p /usr/src/app

EXPOSE  8000

CMD ["python", "app.py", "-p 8000"]
