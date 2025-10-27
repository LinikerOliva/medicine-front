// Script para testar autenticação
const API_BASE = 'http://127.0.0.1:8000/api';

async function testLogin() {
    console.log('🔍 Testando login...');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin', // usuário do seed_liniker
                password: 'Admin123!' // senha do seed_liniker
            })
        });
        
        const data = await response.json();
        console.log('📊 Resposta do login:', data);
        
        if (response.ok && data.token) {
            console.log('✅ Login bem-sucedido!');
            console.log('🔑 Token:', data.token);
            
            // Salvar no localStorage (simulando o que o frontend faz)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('access_token', data.token);
                localStorage.setItem('auth_scheme', 'Token');
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('💾 Dados salvos no localStorage');
            }
            
            // Testar endpoint /me/
            await testMeEndpoint(data.token);
            
            // Testar endpoint /pacientes/me/
            await testPacientesMe(data.token);
            
        } else {
            console.log('❌ Login falhou:', data);
        }
        
    } catch (error) {
        console.error('💥 Erro no login:', error);
    }
}

async function testMeEndpoint(token) {
    console.log('\n🔍 Testando /api/auth/users/me/...');
    
    try {
        const response = await fetch(`${API_BASE}/auth/users/me/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        console.log('📊 Resposta do /me/:', data);
        
        if (response.ok) {
            console.log('✅ /api/auth/users/me/ funcionou!');
        } else {
            console.log('❌ /api/auth/users/me/ falhou:', response.status, data);
        }
        
    } catch (error) {
        console.error('💥 Erro no /me/:', error);
    }
}

async function testPacientesMe(token) {
    console.log('\n🔍 Testando /api/pacientes/me/...');
    
    try {
        const response = await fetch(`${API_BASE}/pacientes/me/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        console.log('📊 Resposta do /pacientes/me/:', data);
        
        if (response.ok) {
            console.log('✅ /api/pacientes/me/ funcionou!');
        } else {
            console.log('❌ /api/pacientes/me/ falhou:', response.status, data);
        }
        
    } catch (error) {
        console.error('💥 Erro no /pacientes/me/:', error);
    }
}

async function checkCurrentAuth() {
    console.log('🔍 Verificando autenticação atual...');
    
    if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('access_token');
        const user = localStorage.getItem('user');
        const scheme = localStorage.getItem('auth_scheme');
        
        console.log('🔑 Token atual:', token ? 'Presente' : 'Ausente');
        console.log('👤 Usuário atual:', user ? JSON.parse(user) : 'Ausente');
        console.log('🔐 Esquema:', scheme || 'Ausente');
        
        if (token) {
            await testMeEndpoint(token);
            await testPacientesMe(token);
        }
    } else {
        console.log('❌ localStorage não disponível');
    }
}

// Executar testes
console.log('🚀 Iniciando testes de autenticação...\n');
checkCurrentAuth().then(() => {
    console.log('\n' + '='.repeat(50));
    return testLogin();
});