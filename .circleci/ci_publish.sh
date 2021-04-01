#!/bin/sh

set -e

if [ "$1" != "" ]; then
    TEST_RUNNER_TAG=$1
else
    echo "TEST_RUNNER_TAG is not set (first argument)"
    exit 1
fi

docker build -t testrunner .
docker tag testrunner $TEST_RUNNER_TAG
docker push $TEST_RUNNER_TAG
