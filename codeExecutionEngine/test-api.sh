#!/bin/bash

# Test 1: Python FizzBuzz
echo "Testing Python FizzBuzz..."
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def fizzbuzz(n):\n\tif n % 15 == 0:\n\t\treturn \"FizzBuzz\"\n\telif n % 3 == 0:\n\t\treturn \"Fizz\"\n\telif n % 5 == 0:\n\t\treturn \"Buzz\"\n\treturn str(n)\n\nn = int(input())\nprint(fizzbuzz(n))",
    "input": "15",
    "config": {
      "timeout_seconds": 5,
      "memory_limit_mb": 128
    },
    "test_cases": [
      {
        "input": "3",
        "expected_output": "Fizz",
        "description": "Number divisible by 3"
      },
      {
        "input": "5",
        "expected_output": "Buzz",
        "description": "Number divisible by 5"
      },
      {
        "input": "15",
        "expected_output": "FizzBuzz",
        "description": "Number divisible by both 3 and 5"
      },
      {
        "input": "7",
        "expected_output": "7",
        "description": "Number not divisible by 3 or 5"
      }
    ]
  }'

echo -e "\n\n"

# Test 2: JavaScript String Reversal
echo "Testing JavaScript String Reversal..."
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "function reverseString(str) {\n    return str.split(\"\").reverse().join(\"\");\n}\n\nconst readline = require(\"readline\").createInterface({input: process.stdin});\nreadline.on(\"line\", (line) => {\n    console.log(reverseString(line));\n    process.exit(0);\n});",
    "input": "hello",
    "config": {
      "timeout_seconds": 5,
      "memory_limit_mb": 128
    },
    "test_cases": [
      {
        "input": "hello",
        "expected_output": "olleh",
        "description": "Basic string reversal"
      },
      {
        "input": "12345",
        "expected_output": "54321",
        "description": "Numeric string reversal"
      },
      {
        "input": "",
        "expected_output": "",
        "description": "Empty string"
      },
      {
        "input": "a",
        "expected_output": "a",
        "description": "Single character"
      }
    ]
  }'

echo -e "\n\n"

# Test 3: Python Array Sum
echo "Testing Python Array Sum..."
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def array_sum(arr):\n\treturn sum(map(int, arr.split()))\n\nprint(array_sum(input()))",
    "input": "1 2 3 4 5",
    "config": {
      "timeout_seconds": 5,
      "memory_limit_mb": 128
    },
    "test_cases": [
      {
        "input": "1 2 3 4 5",
        "expected_output": "15",
        "description": "Positive numbers"
      },
      {
        "input": "-1 -2 -3",
        "expected_output": "-6",
        "description": "Negative numbers"
      },
      {
        "input": "0",
        "expected_output": "0",
        "description": "Single zero"
      },
      {
        "input": "10 -10",
        "expected_output": "0",
        "description": "Sum to zero"
      }
    ]
  }'