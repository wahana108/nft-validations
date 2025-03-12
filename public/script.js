console.log('script.js loaded');

const supabase = window.supabase.createClient('https://jmqwuaybvruzxddsppdh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcXd1YXlidnJ1enhkZHNwcGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTUxNzEsImV4cCI6MjA1NTk5MTE3MX0.ldNdOrsb4BWyFRwZUqIFEbmU0SgzJxiF_Z7eGZPKZJg');
let token = null;

async function login(email, password) {
  try {
    console.log('Logging in with:', email);
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const { token: newToken } = await res.json();
    token = newToken;
    localStorage.setItem('authToken', token);
    console.log('Login successful, token:', token);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('pool').style.display = 'block';
    loadPendingValidations();
    loadValidations();
    checkTopDeveloperStatus();
  } catch (error) {
    console.error('Login error:', error.message);
    alert('Login failed: ' + error.message);
  }
}

async function register(email, password) {
  try {
    console.log('Registering with:', email);
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Register failed: ${res.status}`);
    const result = await res.text();
    console.log('Registration successful:', result);
    alert('Registration successful! Please login.');
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  } catch (error) {
    console.error('Registration error:', error.message);
    alert('Registration failed: ' + error.message);
  }
}

async function logout() {
  try {
    console.log('Logging out');
    token = null;
    localStorage.removeItem('authToken');
    console.log('Logout successful');
    document.getElementById('pool').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('submit-validation-btn').style.display = 'none';
    document.getElementById('action-result').innerHTML = '';
  } catch (error) {
    console.error('Logout error:', error.message);
    alert('Logout failed: ' + error.message);
  }
}

async function loadPendingValidations() {
  try {
    console.log('Loading pending validations');
    const res = await fetch('/pending-validations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const pendingValidations = await res.json();
    console.log('Pending validations loaded:', pendingValidations);
    const pendingDiv = document.getElementById('pending-validations');
    pendingDiv.innerHTML = '';
    if (pendingValidations.length === 0) {
      pendingDiv.innerHTML = '<p>No pending projects yet.</p>';
    } else {
      pendingValidations.forEach(val => {
        pendingDiv.innerHTML += `
          <div class="validation-card">
            <p>Validation ID: ${val.id} | NFT ID: ${val.nft_id} | Title: ${val.title} | Validator: ${val.validator_id} | Value: Rp${val.project_value}</p>
            ${val.image_url ? `<img src="${val.image_url}" alt="${val.title}" class="nft-image">` : '<p>No image available</p>'}
            <p>Transaction Proof: <a href="${val.transaction_proof}" target="_blank">View Proof</a></p>
            ${val.revalidation_of ? `<p style="color: orange;">(Revalidation of ID: ${val.revalidation_of})</p>` : ''}
          </div>`;
      });
    }
  } catch (error) {
    console.error('Error loading pending validations:', error.message);
    document.getElementById('pending-validations').innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function loadValidations() {
  try {
    console.log('Loading validations');
    const res = await fetch('/validations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const validations = await res.json();
    console.log('Validations loaded:', validations);
    const validationsDiv = document.getElementById('validations');
    validationsDiv.innerHTML = '';
    if (validations.length === 0) {
      validationsDiv.innerHTML = '<p>No validated NFTs yet.</p>';
    } else {
      validations.forEach(val => {
        validationsDiv.innerHTML += `
          <div class="validation-card">
            <p>Validation ID: ${val.id} | NFT ID: ${val.nft_id} | Title: ${val.title} | Validator: ${val.validator_id} | Value: Rp${val.project_value}</p>
            ${val.image_url ? `<img src="${val.image_url}" alt="${val.title}" class="nft-image">` : '<p>No image available</p>'}
            ${val.validated_at ? `<p>Validated: ${new Date(val.validated_at).toLocaleString()}</p>` : ''}
            <p>Transaction Proof: <a href="${val.transaction_proof}" target="_blank">View Proof</a></p>
          </div>`;
      });
    }
  } catch (error) {
    console.error('Error loading validations:', error.message);
    document.getElementById('validations').innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function submitValidation() {
  try {
    // Bersihkan pesan error sebelumnya
    document.getElementById('action-result').innerHTML = '';

    const nftId = document.getElementById('nft-id').value;
    const projectValue = document.getElementById('project-value').value;
    const transactionProof = document.getElementById('transaction-proof').value;

    // Validasi input
    if (!nftId || isNaN(nftId) || parseInt(nftId) <= 0) {
      throw new Error('Please enter a valid NFT ID');
    }
    if (!projectValue || isNaN(projectValue) || parseInt(projectValue) < 100000) {
      throw new Error('Please enter a valid project value (minimum Rp100,000)');
    }
    if (!transactionProof) {
      throw new Error('Please enter a transaction proof link');
    }

    // Validasi URL sederhana
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    if (!urlPattern.test(transactionProof)) {
      throw new Error('Please enter a valid URL for the transaction proof (e.g., https://etherscan.io/tx/...)');
    }

    console.log('Submitting validation for NFT:', nftId);
    const res = await fetch('/submit-validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nft_id: parseInt(nftId), project_value: parseInt(projectValue), transaction_proof: transactionProof })
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    const result = await res.text();
    console.log('Validation submitted:', result);
    document.getElementById('action-result').innerHTML = `<p>${result}</p>`;
    loadPendingValidations();
    loadValidations();
  } catch (error) {
    console.error('Error submitting validation:', error.message);
    document.getElementById('action-result').innerHTML = `
      <p>Error: ${error.message}</p>
      <button onclick="document.getElementById('action-result').innerHTML = ''">Dismiss</button>
    `;
  }
}

async function confirmValidation() {
  try {
    const validationId = prompt('Enter Validation ID to confirm:');
    if (!validationId) return alert('Please enter Validation ID');
    console.log('Confirming validation for ID:', validationId);
    const res = await fetch('/confirm-validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ validation_id: parseInt(validationId) })
    });
    if (!res.ok) throw new Error(`Confirm failed: ${res.status}`);
    const result = await res.text();
    console.log('Validation confirmed:', result);
    document.getElementById('action-result').innerHTML = `<p>${result}</p>`;
    loadPendingValidations();
    loadValidations();
  } catch (error) {
    console.error('Error confirming validation:', error.message);
    document.getElementById('action-result').innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function rejectValidation() {
  try {
    const validationId = prompt('Enter Validation ID to reject:');
    if (!validationId) return alert('Please enter Validation ID');
    console.log('Rejecting validation for ID:', validationId);
    const res = await fetch('/reject-validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ validation_id: parseInt(validationId) })
    });
    if (!res.ok) throw new Error(`Reject failed: ${res.status}`);
    const result = await res.text();
    console.log('Validation rejected:', result);
    document.getElementById('action-result').innerHTML = `<p>${result}</p>`;
    loadPendingValidations();
    loadValidations();
  } catch (error) {
    console.error('Error rejecting validation:', error.message);
    document.getElementById('action-result').innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function revalidateProject() {
  try {
    // Bersihkan pesan error sebelumnya
    document.getElementById('action-result').innerHTML = '';

    const validationId = prompt('Enter Validation ID to revalidate:');
    const newValidatorId = prompt('Enter New Validator ID:');
    const transactionProof = prompt('Enter Transaction Proof Link:');

    // Validasi input
    if (!validationId || isNaN(validationId) || parseInt(validationId) <= 0) {
      throw new Error('Please enter a valid Validation ID');
    }
    if (!newValidatorId) {
      throw new Error('Please enter a new Validator ID');
    }
    if (!transactionProof) {
      throw new Error('Please enter a transaction proof link');
    }

    // Validasi URL sederhana
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    if (!urlPattern.test(transactionProof)) {
      throw new Error('Please enter a valid URL for the transaction proof (e.g., https://etherscan.io/tx/...)');
    }

    console.log('Revalidating project for ID:', validationId);
    
    // tambahkan console.log di sini :
    console.log('Sending revalidation data:', {
      validation_id: parseInt(validationId),
      new_validator_id: newValidatorId,
      transaction_proof: transactionProof
    });

    const res = await fetch('/revalidate-project', { // <- sebelumnya kode diletakan di sini
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        validation_id: parseInt(validationId),
        new_validator_id: newValidatorId,
        transaction_proof: transactionProof
      })
    });
    if (!res.ok) throw new Error(`Revalidate failed: ${res.status}`);
    const result = await res.text();
    console.log('Revalidation submitted:', result);
    document.getElementById('action-result').innerHTML = `<p>${result}</p>`;
    loadPendingValidations();
    loadValidations();
  } catch (error) {
    console.error('Error revalidating:', error.message);
    document.getElementById('action-result').innerHTML = `
      <p>Error: ${error.message}</p>
      <button onclick="document.getElementById('action-result').innerHTML = ''">Dismiss</button>
    `;
  }
}

async function convertValidNft() {
  try {
    const nftId = prompt('Enter NFT ID to convert:');
    if (!nftId) return alert('Please enter NFT ID');
    console.log('Converting valid NFT:', nftId);
    const res = await fetch('/convert-valid-nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nft_id: parseInt(nftId) })
    });
    if (!res.ok) throw new Error(`Convert failed: ${res.status}`);
    const result = await res.text();
    console.log('NFT converted:', result);
    document.getElementById('action-result').innerHTML = `<p>${result}</p>`;
    loadPendingValidations();
    loadValidations();
  } catch (error) {
    console.error('Error converting NFT:', error.message);
    document.getElementById('action-result').innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function checkTopDeveloperStatus() {
  try {
    const res = await fetch('/top-developers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const { topDevelopers } = await res.json();
    console.log('Top developers:', topDevelopers);

    // Ambil user ID dari token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Failed to fetch user data');

    // Ambil semua NFT yang dimiliki oleh vendor_id tertentu
    const { data: nfts, error: nftError } = await supabase
      .from('nfts')
      .select('vendor_id')
      .eq('vendor_id', user.id);
    if (nftError) throw nftError;

    // Periksa apakah salah satu vendor_id dari NFT pengguna ada di top developers
    const userVendorIds = nfts.map(nft => nft.vendor_id);
    const isTopDeveloper = userVendorIds.some(vendorId => 
      topDevelopers.some(dev => dev.id === vendorId)
    );

    const submitBtn = document.getElementById('submit-validation-btn');
    if (isTopDeveloper) {
      submitBtn.style.display = 'block';
    } else {
      submitBtn.style.display = 'none';
      if (document.getElementById('action-result').innerHTML.includes('Error')) {
        document.getElementById('action-result').innerHTML = '<p>You must be a top developer to submit validations.</p>';
      }
    }
  } catch (error) {
    console.error('Error checking top developer status:', error.message);
    document.getElementById('submit-validation-btn').style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  token = localStorage.getItem('authToken');
  if (token) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('pool').style.display = 'block';
    loadPendingValidations();
    loadValidations();
    checkTopDeveloperStatus();
  } else {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('pool').style.display = 'none';
  }
  document.getElementById('login-btn')?.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
  document.getElementById('register-btn')?.addEventListener('click', () => {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    register(email, password);
  });
  document.getElementById('show-register-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });
  document.getElementById('show-login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('submit-validation-btn')?.addEventListener('click', submitValidation);
  document.getElementById('confirm-validation-btn')?.addEventListener('click', confirmValidation);
  document.getElementById('reject-validation-btn')?.addEventListener('click', rejectValidation);
  document.getElementById('revalidate-btn')?.addEventListener('click', revalidateProject);
  document.getElementById('convert-nft-btn')?.addEventListener('click', convertValidNft);
});