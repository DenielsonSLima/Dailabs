const API_BRASIL_TOKEN = process.env.API_BRASIL_TOKEN;
const API_BRASIL_ENDPOINT = process.env.API_BRASIL_ENDPOINT || 'https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits';
const API_BRASIL_TIPO_CONSULTA = process.env.API_BRASIL_TIPO_CONSULTA || 'fipe-chassi';
const placa = process.env.TEST_PLACA || 'SYA7J13';

async function testApiBrasil() {
    if (!API_BRASIL_TOKEN) {
        throw new Error('Defina API_BRASIL_TOKEN no ambiente antes de executar este teste.');
    }

    console.log(`Testando placa: ${placa}`);
    try {
        const response = await fetch(API_BRASIL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_BRASIL_TOKEN}`
            },
            body: JSON.stringify({
                tipo: API_BRASIL_TIPO_CONSULTA,
                placa: placa,
                homolog: false
            })
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json();
        console.log('Dados:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro:', error);
    }
}

testApiBrasil();
