GIT_COMMIT_SHA=$(git rev-parse --short=7 HEAD)
TEST_RUNNER_TAG=gcr.io/omisego-development/omg-js-testrunner:$GIT_COMMIT_SHA

echo $GCLOUD_SERVICE_KEY | gcloud auth activate-service-account --key-file=-
gcloud -q auth configure-docker

docker build -t testrunner .
docker tag testrunner $TEST_RUNNER_TAG
docker push $TEST_RUNNER_TAG
