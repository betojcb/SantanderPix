from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import requests
from OpenSSL import crypto
from requests_pkcs12 import Pkcs12Adapter
from urllib.parse import urlencode
import atexit
import os

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization", "X-Application-Key"]
    }
})

global_access_token = None

client_id = "32-digits"
client_secret = "16-digits"
pfx_password = 'your_password'
pfx_filename = 'name.pfx'
bank_agency = '4-digits'
bank_account_number = '12-digits'

def load_pfx(path, password):
    with open(path, 'rb') as f:
        pfx = crypto.load_pkcs12(f.read(), password.encode())
    return pfx

def get_token():
    try:
        global global_access_token
        project_root = os.path.dirname(os.path.abspath(__file__)) 
        pfx_path = os.path.join(project_root, pfx_filename)
        session = requests.Session()
        session.mount('https://', Pkcs12Adapter(pkcs12_filename=pfx_path, pkcs12_password=pfx_password))
        auth_url = 'https://trust-open.api.santander.com.br/auth/oauth/v2/token'
        data = {'grant_type': 'client_credentials', 'client_id': client_id, 'client_secret': client_secret}
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = session.post(auth_url, data=data, headers=headers)
        responseData = response.json()
        if 'access_token' in responseData:
            global_access_token = responseData['access_token']
    except Exception as e:
        return {"error": "An error occurred", "message": str(e)}
 
@app.route('/recentPix', methods=['GET'])
def recent_pix():
    try:
        global global_access_token
        if not global_access_token:
            get_token()
            if not global_access_token:
                return jsonify({"error": "Token not available"}), 503
        
        session = requests.Session()
        project_root = os.path.dirname(os.path.abspath(__file__))
        pfx_path = os.path.join(project_root, pfx_filename)
        session.mount('https://', Pkcs12Adapter(pkcs12_filename=pfx_path, pkcs12_password=pfx_password))
        
        headers = {
            'X-Application-Key': client_id, 
            'Authorization': 'Bearer ' + global_access_token
        }
        url = f'https://trust-open.api.santander.com.br/bank_account_information/v1/banks/90400888000142/statements/{bank_agency}.{bank_account_number}'
        
        limit = 150
        offset = 1
        received_pix_transactions = []

        queryString = f"?_offset={offset}&_limit={limit}&initialDate={(datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')}&finalDate={(datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')}"
        response = session.get(url + queryString, headers=headers)
        if response.ok:
            response_data = response.json()
            for item in response_data['_content']:
                if item['transactionName'] == 'PIX RECEBIDO':
                    received_pix_transactions.append(item)
        else:
            get_token()
            response = session.get(url + queryString, headers=headers)
            if not response.ok:
                return jsonify({"error": f"Failed to fetch data, url: ({url+queryString})", "status_code": response.status_code}), response.status_code
            else:
                response_data = response.json()
                for item in response_data['_content']:
                    if item['transactionName'] == 'PIX RECEBIDO':
                        received_pix_transactions.append(item)
        
        transactions_list = [
                {
                    'name': txn['historicComplement'],
                    'value': txn['amount'],
                    'insertionDate': txn['transactionDate']
                } for txn in sorted(received_pix_transactions, key=lambda x: x['transactionDate'], reverse=True)[:30]
            ]


        last_fetched = (datetime.now() - timedelta(hours=3)).strftime("%H:%M:%S %d-%m-%Y ")
        return jsonify({'transactions': transactions_list, 'lastFetched': last_fetched}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": "Failed to fetch data"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=57000)

