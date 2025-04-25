const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();
const port = process.env.PORT || 3008;

const supabaseUrl = 'https://oqquvpjikdbjlagdlbhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcXV2cGppa2RiamxhZ2RsYmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk1MTgwOCwiZXhwIjoyMDYwNTI3ODA4fQ.cJri-wLQcDod3J49fUKesAY2cnghU3jtlD4BiuYMelw'; // Ganti dengan service_role key dari Supabase Dashboard
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('No token provided');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).send('Unauthorized');
  req.user = user;
  next();
};

const requireAdmin = async (req, res, next) => {
  if (req.user.email !== 'ramawan@live.com') return res.status(403).send('Admin access required');
  next();
};

app.get('/top-developers', authenticate, async (req, res) => {
  try {
    console.log('Fetching top developers');
    const { data, error } = await supabase
      .from('vendor_score')
      .select('vendor_id, score')
      .order('score', { ascending: false })
      .limit(3);
    if (error) throw error;
    const topDevelopers = data.map(item => ({
      id: item.vendor_id,
      score: item.score
    }));
    console.log('Top developers:', topDevelopers);
    res.json({ topDevelopers });
  } catch (error) {
    console.error('Error fetching top developers:', error.message);
    res.status(500).send(error.message);
  }
});

app.get('/pending-validations', authenticate, async (req, res) => {
  try {
    console.log('Fetching pending validations');
    const { data, error } = await supabase
      .from('validation')
      .select('id, nft_id, validator_id, project_value, validated_at, status, transaction_proof, revalidation_of')
      .eq('status', 'pending')
      .order('id', { ascending: true });
    if (error) throw error;
    console.log('Pending validations:', data);
    const nfts = [];
    for (const validation of data) {
      const { data: nft, error: nftError } = await supabase
        .from('nfts')
        .select('id, title, vendor_id, image_url')
        .eq('id', validation.nft_id)
        .single();
      if (nftError) {
        console.error('Error fetching NFT:', nftError.message);
        continue;
      }
      nfts.push({
        id: validation.id,
        nft_id: nft.id,
        title: nft.title || 'Pending NFT',
        vendor_id: nft.vendor_id,
        validator_id: validation.validator_id,
        project_value: validation.project_value,
        validated_at: validation.validated_at,
        image_url: nft.image_url || null,
        transaction_proof: validation.transaction_proof,
        revalidation_of: validation.revalidation_of
      });
    }
    res.json(nfts);
  } catch (error) {
    console.error('Error fetching pending validations:', error.message);
    res.status(500).send(error.message);
  }
});

app.get('/validations', authenticate, async (req, res) => {
  try {
    console.log('Fetching validated NFTs');
    const { data, error } = await supabase
      .from('validation')
      .select('id, nft_id, validator_id, project_value, validated_at, status, transaction_proof')
      .eq('status', 'validated')
      .order('validated_at', { ascending: true });
    if (error) throw error;
    console.log('Validated NFTs:', data);
    const nfts = [];
    for (const validation of data) {
      const { data: nft, error: nftError } = await supabase
        .from('nfts')
        .select('id, title, vendor_id, image_url')
        .eq('id', validation.nft_id)
        .single();
      if (nftError) {
        console.error('Error fetching NFT:', nftError.message);
        continue;
      }
      nfts.push({
        id: validation.id,
        nft_id: nft.id,
        title: nft.title || 'Validated NFT',
        vendor_id: nft.vendor_id,
        validator_id: validation.validator_id,
        project_value: validation.project_value,
        validated_at: validation.validated_at,
        image_url: nft.image_url || null,
        transaction_proof: validation.transaction_proof
      });
    }
    res.json(nfts);
  } catch (error) {
    console.error('Error fetching validated NFTs:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/submit-validation', authenticate, async (req, res) => {
  try {
    const { nft_id, project_value, transaction_proof } = req.body;
    const validatorId = req.user.id;
    const guarantee_amount = project_value * 2;
    const { data: topDevelopers, error: devError } = await supabase
      .from('vendor_score')
      .select('vendor_id')
      .order('score', { ascending: false })
      .limit(3);
    if (devError) throw devError;
    if (!topDevelopers.some(dev => dev.vendor_id === validatorId)) {
      return res.status(403).send('Only top developers can submit validations');
    }
    const { data: nft, error: nftError } = await supabase
      .from('nfts')
      .select('id, vendor_id')
      .eq('id', nft_id)
      .eq('vendor_id', validatorId)
      .single();
    if (nftError || !nft) return res.status(404).send('NFT not found or not owned by validator');
    const { error: insertError } = await supabase
      .from('validation')
      .insert({
        nft_id,
        validator_id: validatorId,
        project_value,
        guarantee_amount,
        validated_at: null,
        status: 'pending',
        transaction_proof
      });
    if (insertError) throw insertError;
    res.send('Validation request submitted. Awaiting admin confirmation.');
  } catch (error) {
    console.error('Error submitting validation:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/confirm-validation', authenticate, requireAdmin, async (req, res) => {
  try {
    const { validation_id } = req.body;
    const { data: validation, error: fetchError } = await supabase
      .from('validation')
      .select('*')
      .eq('id', validation_id)
      .eq('status', 'pending')
      .single();
    if (fetchError || !validation) throw new Error('Validation not found or not pending');
    const { error: updateError } = await supabase
      .from('validation')
      .update({
        validated_at: new Date().toISOString(),
        status: 'validated'
      })
      .eq('id', validation_id);
    if (updateError) throw updateError;
    if (validation.revalidation_of) {
      const { error: updateValidatorError } = await supabase
        .from('validator')
        .update({ validator_id: validation.validator_id, status: 'active' })
        .eq('nft_id', validation.nft_id)
        .eq('project_id', `project_reval_${validation.revalidation_of}`);
      if (updateValidatorError) throw updateValidatorError;
    } else {
      const { error: validatorError } = await supabase
        .from('validator')
        .insert({
          validator_id: validation.validator_id,
          nft_id: validation.nft_id,
          project_id: `project_${validation.id}`,
          staking_amount: Math.floor(validation.guarantee_amount / 2)
        });
      if (validatorError) throw validatorError;
    }
    res.send('Validation confirmed by admin.');
  } catch (error) {
    console.error('Error confirming validation:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/reject-validation', authenticate, requireAdmin, async (req, res) => {
  try {
    const { validation_id } = req.body;
    const { data: validation, error: fetchError } = await supabase
      .from('validation')
      .select('*')
      .eq('id', validation_id)
      .eq('status', 'pending')
      .single();
    if (fetchError || !validation) throw new Error('Validation not found or not pending');
    const { error: deleteError } = await supabase
      .from('validation')
      .delete()
      .eq('id', validation_id);
    if (deleteError) throw deleteError;
    res.send('Validation request rejected and removed.');
  } catch (error) {
    console.error('Error rejecting validation:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/revalidate-project', authenticate, async (req, res) => {
  try {
    const { validation_id, new_validator_id, transaction_proof } = req.body;
    if (!transaction_proof) throw new Error('Transaction proof is required');
    const oldValidator = req.user.id;
    const { data: validation, error: fetchError } = await supabase
      .from('validation')
      .select('*')
      .eq('id', validation_id)
      .eq('status', 'validated')
      .single();
    if (fetchError || !validation) throw new Error('Validation not found or not validated');
    console.log('Validation data:', validation);
    console.log('Inserting new validation with:', {
      nft_id: validation.nft_id,
      validator_id: new_validator_id,
      project_value: validation.project_value,
      guarantee_amount: validation.guarantee_amount,
      transaction_proof: transaction_proof,
      revalidation_of: validation_id
    });
    const { error: newValidationError } = await supabase
      .from('validation')
      .insert({
        nft_id: validation.nft_id,
        validator_id: new_validator_id,
        project_value: validation.project_value,
        guarantee_amount: validation.guarantee_amount,
        validated_at: null,
        status: 'pending',
        transaction_proof: transaction_proof,
        revalidation_of: validation_id
      });
    if (newValidationError) throw newValidationError;
    const { error: updateValidatorError } = await supabase
      .from('validator')
      .update({ validator_id: new_validator_id, status: 'replaced' })
      .eq('validator_id', oldValidator)
      .eq('nft_id', validation.nft_id);
    if (updateValidatorError) throw updateValidatorError;
    const { error: newValidatorError } = await supabase
      .from('validator')
      .insert({
        validator_id: new_validator_id,
        nft_id: validation.nft_id,
        project_id: `project_reval_${validation_id}`,
        staking_amount: Math.floor(validation.guarantee_amount / 2)
      });
    if (newValidatorError) throw newValidatorError;
    res.send('Revalidation request submitted. Awaiting admin confirmation.');
  } catch (error) {
    console.error('Error in revalidation:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/convert-valid-nft', authenticate, async (req, res) => {
  try {
    const { nft_id } = req.body;
    const validatorId = req.user.id;
    const { data: validation, error: fetchError } = await supabase
      .from('validation')
      .select('*')
      .eq('nft_id', nft_id)
      .eq('status', 'validated')
      .single();
    if (fetchError || !validation) throw new Error('NFT not found or not validated');
    const { data: vendor, error: vendorError } = await supabase
      .from('nfts')
      .select('vendor_id')
      .eq('id', nft_id)
      .single();
    if (vendorError) throw vendorError;
    const { error: insertError } = await supabase
      .from('nft_recommendations')
      .insert({
        nft_id,
        vendor_id: vendor.vendor_id,
        added_at: new Date().toISOString(),
        status: 'available'
      });
    if (insertError) throw insertError;
    const { error: deleteError } = await supabase
      .from('validation')
      .delete()
      .eq('nft_id', nft_id);
    if (deleteError) throw deleteError;
    res.send('NFT converted and burned. Available for buyback.');
  } catch (error) {
    console.error('Error converting valid NFT:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ token: data.session.access_token });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).send(error.message);
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    res.send('Registration successful! Please login.');
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).send(error.message);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
