// Debug do carregamento do perfil do usuário
const API_URL = 'http://127.0.0.1:8000';

async function debugProfileLoading() {
    try {
        console.log('🔍 Iniciando debug do carregamento do perfil...');
        
        // 1. Verificar se há token no localStorage
        console.log('\n📱 Verificando localStorage...');
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        console.log('Token no localStorage:', token ? `${token.substring(0, 20)}...` : 'AUSENTE');
        console.log('User no localStorage:', user ? JSON.parse(user) : 'AUSENTE');
        
        if (!token) {
            console.log('❌ Token não encontrado! Fazendo login...');
            
            // Fazer login
            const loginResponse = await fetch(`${API_URL}/api/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'Admin123!'
                })
            });

            if (!loginResponse.ok) {
                throw new Error(`Login falhou: ${loginResponse.status}`);
            }

            const loginData = await loginResponse.json();
            console.log('✅ Login realizado com sucesso');
            
            // Salvar no localStorage
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify(loginData.user));
            
            console.log('💾 Dados salvos no localStorage');
        }
        
        // 2. Testar os endpoints que o frontend usa
        const currentToken = localStorage.getItem('token');
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        console.log('\n🔍 Testando endpoints do frontend...');
        
        // Testar /api/users/{id}/ (getPerfil)
        console.log('\n📋 Testando getPerfil() - /api/users/{id}/...');
        try {
            const perfilResponse = await fetch(`${API_URL}/api/users/${currentUser.id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${currentToken}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Status getPerfil():', perfilResponse.status);
            
            if (perfilResponse.ok) {
                const perfilData = await perfilResponse.json();
                console.log('✅ getPerfil() OK - Dados:', {
                    nome: `${perfilData.first_name} ${perfilData.last_name}`,
                    email: perfilData.email,
                    telefone: perfilData.telefone,
                    data_nascimento: perfilData.data_nascimento
                });
            } else {
                const errorText = await perfilResponse.text();
                console.log('❌ getPerfil() ERRO:', errorText);
            }
        } catch (error) {
            console.log('❌ getPerfil() EXCEÇÃO:', error.message);
        }
        
        // Testar /api/pacientes/me/ (getPacienteDoUsuario)
        console.log('\n🏥 Testando getPacienteDoUsuario() - /api/pacientes/me/...');
        try {
            const pacienteResponse = await fetch(`${API_URL}/api/pacientes/me/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${currentToken}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Status getPacienteDoUsuario():', pacienteResponse.status);
            
            if (pacienteResponse.ok) {
                const pacienteData = await pacienteResponse.json();
                console.log('✅ getPacienteDoUsuario() OK - Dados:', {
                    id: pacienteData.id,
                    idade: pacienteData.idade,
                    tipo_sanguineo: pacienteData.tipo_sanguineo,
                    alergias: pacienteData.alergias?.substring(0, 50) + '...',
                    condicoes_cronicas: pacienteData.condicoes_cronicas
                });
            } else {
                const errorText = await pacienteResponse.text();
                console.log('❌ getPacienteDoUsuario() ERRO:', errorText);
            }
        } catch (error) {
            console.log('❌ getPacienteDoUsuario() EXCEÇÃO:', error.message);
        }
        
        // 3. Simular o que o componente React faz
        console.log('\n⚛️ Simulando comportamento do componente React...');
        
        const promises = [
            fetch(`${API_URL}/api/users/${currentUser.id}/`, {
                headers: { 'Authorization': `Token ${currentToken}` }
            }),
            fetch(`${API_URL}/api/pacientes/me/`, {
                headers: { 'Authorization': `Token ${currentToken}` }
            })
        ];
        
        const results = await Promise.allSettled(promises);
        
        console.log('Resultado Promise.allSettled:');
        results.forEach((result, index) => {
            const endpoint = index === 0 ? 'getPerfil' : 'getPacienteDoUsuario';
            if (result.status === 'fulfilled') {
                console.log(`✅ ${endpoint}: Status ${result.value.status}`);
            } else {
                console.log(`❌ ${endpoint}: Rejeitado - ${result.reason.message}`);
            }
        });
        
        // Verificar se ambos falharam (condição do erro no componente)
        const bothFailed = results.every(r => r.status === 'rejected');
        if (bothFailed) {
            console.log('🚨 PROBLEMA IDENTIFICADO: Ambas as promises foram rejeitadas!');
            console.log('   Isso causaria o erro "Não foi possível carregar seu perfil."');
        } else {
            console.log('✅ Pelo menos uma promise foi bem-sucedida');
        }
        
    } catch (error) {
        console.error('❌ Erro geral no debug:', error.message);
    }
}

// Executar o debug
debugProfileLoading();