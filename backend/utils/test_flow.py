import requests

API_URL = "http://localhost:5000/fully-auto-redact"
TEST_INPUT = "sandhyaa_cv.pdf"  # or your test file
TEST_OUTPUT = "test_flow_redacted_output.pdf"

def test_fully_auto_redact():
    print(f"Uploading {TEST_INPUT} to {API_URL}...")
    with open(TEST_INPUT, "rb") as f:
        files = {"file": f}
        response = requests.post(API_URL, files=files)
    print("Status Code:", response.status_code)
    if response.status_code == 200 and "pdf" in response.headers.get("Content-Type", ""):
        with open(TEST_OUTPUT, "wb") as out_file:
            out_file.write(response.content)
        print(f"Redacted PDF saved as {TEST_OUTPUT}")
    else:
        print("Failed! Response:", response.text[:1000])

if __name__ == "__main__":
    test_fully_auto_redact()
