
var network = localStorage.getItem("network");
var networkNode = "wss://testnet.xrpl-labs.com/";
$('#current_network').text("Testnet")


if(network !== null) {
  if(network === 'prod') {
    networkNode = "wss://xrplcluster.com/"
    $('#current_network').text("Mainnet")
  }
  else {
    networkNode = "wss://testnet.xrpl-labs.com/"
    $('#current_network').text("Testnet")
  }
}

function changeNetwork() {
  var network = localStorage.getItem("network");
  if(network !== null) {
    if(network === 'prod') {
      localStorage.setItem("network","test");
    }
    else {
      localStorage.setItem("network","prod");
    }
  }
  else {
    localStorage.setItem("network","prod");
  }
  location.reload();
}

var client = new xrpl.Client(networkNode);

function saveAddressInStorage(address, secret, oldaddress, seed) {
  var addresses = JSON.parse(localStorage.getItem("addresses"));
  if(addresses != null) {
    addresses.push({address:address, key: secret, oldaddress:oldaddress, seed:seed});
    
  }
  else {
    addresses = []
    addresses.push({address:address, key: secret, oldaddress:oldaddress, seed:seed});
  }
  localStorage.setItem("addresses", JSON.stringify(addresses));
}



function getFirstAddress() {
  var addresses = JSON.parse(localStorage.getItem("addresses"));
  return addresses[0];
}

async function sendTransaction() {
  var recipient = $('#trx_address').val();
  if(recipient == '') {
    $('#errorTrx').css("display","block");
    $('#errorTrx').text("Recipient is invalid");
    return;
  }
  var amount = $('#trx_amount').val();
  if(amount == '') {
    $('#errorTrx').css("display","block");
    $('#errorTrx').text("Amount is invalid");
    return;
  }

  var trx_password = $('#trx_password').val();
  if(trx_password == '') {
    $('#errorTrx').css("display","block");
    $('#errorTrx').text("You need to enter your password");
    return;
  }
  $('.invalid-feedback').css('display','none');
  $('.valid-feedback').css('display','block');
  $('.valid-feedback').text('Executing transaction.');
  var privateKey = CryptoJS.AES.decrypt(localStorage.getItem('xrplWalletSecret'), trx_password).toString(CryptoJS.enc.Utf8);
  if(privateKey !== '')
  {
    const originWallet = xrpl.Wallet.fromSeed(privateKey);
    await client.connect()
    const prepared = await client.autofill({
        "TransactionType": "Payment",
        "Account": originWallet.address,
        "Amount": xrpl.xrpToDrops(amount),
        "Destination": recipient
    });
    const signed = originWallet.sign(prepared);
    const tx = await client.submitAndWait(signed.tx_blob);
    console.log(tx)
    if (tx.result != null && tx.result.meta != null && tx.result.meta.TransactionResult != null
        && tx.result.meta.TransactionResult == "tesSUCCESS") {
          $('#trx_address').val("");
          $('#trx_amount').val("");
          $('#trx_password').val("");
          $('.invalid-feedback').css('display','none');
          $('.valid-feedback').css('display','block');
          $('.valid-feedback').text('Transaction was executed successfully.');
    }
    else {
      $('.valid-feedback').css('display','none');
      $('.invalid-feedback').css('display','block');
      $('.invalid-feedback').text('Transaction was executed with errors. Try again.');
    }
  } else {
    $('.valid-feedback').css('display','none');
      $('.invalid-feedback').css('display','block');
      $('.invalid-feedback').text('The password is invalid');
  }
  

  client.disconnect();
  checkBalance();
}

async function mintToken() {

  var trx_password = $('#trx_password').val();
  if(trx_password == '') {
    $('#errorTrx').css("display","block");
    $('#errorTrx').text("You need to enter your password");
    return;
  }

  var privateKey = CryptoJS.AES.decrypt(localStorage.getItem('xrplWalletSecret'), trx_password).toString(CryptoJS.enc.Utf8);
  if(privateKey === '') {
    $('#errorTrx').css("display","block");
    $('#errorTrx').text("The password is invalid");
  }
  else {
    var tokenName = $('#nft_name').val();
    if(tokenName == '') {
      $('#errorTrx').css("display","block");
      $('#errorTrx').text("The name is invalid");
      return;
    }

    var tokenDescription = $('#nft_description').val();
    if(tokenDescription == '') {
      $('#errorTrx').css("display","block");
      $('#errorTrx').text("The description is invalid");
      return;
    }

    var tokenAccount = $('#nft_account').val();

    var obj = new Object();
    obj.name = tokenName
    obj.description  = tokenDescription;
    obj.issuer = localStorage.getItem("xrplWalletAddress");
    obj.owner = tokenAccount == ''? localStorage.getItem("xrplWalletAddress") : tokenAccount;
    var jsonString = JSON.stringify(obj);
    var newNftMetadata = await ipfsClient.add(jsonString);

    if(newNftMetadata !== null) {
      const standby_wallet = xrpl.Wallet.fromSeed(privateKey)
      await client.connect()
      const transactionBlob = await client.autofill({
        "TransactionType": "NFTokenMint",
        "Account": standby_wallet.address,
        "URI": xrpl.convertStringToHex("ipfs://"+newNftMetadata.path),
        "NFTokenTaxon": 0,
        "Flags": 1
      });
      const cst_prepared = await client.autofill(transactionBlob)
      const signed = standby_wallet.sign(cst_prepared);
      const tx = await client.submitAndWait(signed.tx_blob)
      console.log(tx);

      client.disconnect()
    }
  }

  
}

async function checkNfts() {
  const myWallet = "rEFLkp6kqHhCfnQ7qGywrFiFDkhVLgtegc" // localStorage.getItem("xrplWalletAddress") // 
  await client.connect()
  try {
    var list = document.querySelector('.tokenList');
        var table = document.createElement('table');
        var thead = document.createElement('thead');
        var tbody = document.createElement('tbody');

        var theadTr = document.createElement('tr');
        var balanceHeader = document.createElement('th');
        balanceHeader.innerHTML = 'URI';
        theadTr.appendChild(balanceHeader);
        var contractNameHeader = document.createElement('th');
        contractNameHeader.innerHTML = 'Issuer';
        theadTr.appendChild(contractNameHeader);
        var contractTickerHeader = document.createElement('th');
        contractTickerHeader.innerHTML = 'NFTokenID';
        theadTr.appendChild(contractTickerHeader);
        
        var usdHeader = document.createElement('th');
        usdHeader.innerHTML = 'nft_serial';
        theadTr.appendChild(usdHeader);

        thead.appendChild(theadTr)

        table.className = 'table';
        table.appendChild(thead);
    const nfts = await client.request({
      method: "account_nfts",
      account: myWallet
    });
    if(nfts !== null && nfts.result.account_nfts !== null) {
      
        for (j = 0; j < nfts.result.account_nfts.length; j++) {
          //var nft_flag = nfts.result.account_nfts[j].Flags;
          //if(nft_flag === null || nft_flag === undefined || nft_flag !== 8) {
            var tbodyTr = document.createElement('tr');
            var contractTd = document.createElement('td');
            var urlToken = nfts.result.account_nfts[j].URI !== null ? xrpl.convertHexToString(nfts.result.account_nfts[j].URI) : "";
            urlToken = urlToken.replace("ipfs://","https://ipfs.io/ipfs/");
            contractTd.innerHTML = nfts.result.account_nfts[j].URI !== null ? "<a href='" + urlToken + "' target='_blank''>Open</a>" : "";
            tbodyTr.appendChild(contractTd);
            var contractTickerTd = document.createElement('td');
            contractTickerTd.innerHTML = '<b>' + nfts.result.account_nfts[j].Issuer + '</b>';
            tbodyTr.appendChild(contractTickerTd);
            var balanceTd = document.createElement('td');
            balanceTd.innerHTML = '<b>' + nfts.result.account_nfts[j].NFTokenID + '</b>';
            tbodyTr.appendChild(balanceTd);
            var balanceUSDTd = document.createElement('td');
            balanceUSDTd.innerHTML = '<b>' + nfts.result.account_nfts[j].nft_serial + '</b>';
            tbodyTr.appendChild(balanceUSDTd);
            tbody.appendChild(tbodyTr);
          //}
            
        }
        table.appendChild(tbody);

        list.appendChild(table);
    }
  }
  catch {
    var list = document.querySelector('.tokenList');
    var contractTd = document.createElement('p');
    contractTd.className = ''
    contractTd.innerHTML = "You don't have any Souldbound token."
    list.appendChild(contractTd);
  }
  
  client.disconnect()
}


async function generateWallet()
{
  await client.connect()
  $('#creatingwallet').show();
  const my_wallet = (await client.fundWallet()).wallet;
  if (my_wallet != null) {
    $('#new_address_generated').show();
      $('#xrplAccount').text(my_wallet.address);
      $('#xrplPublicKey').text(my_wallet.publicKey);
      $('#xrplPrivateKey').text(my_wallet.privateKey);
      $('#xrplSeedCode').text(my_wallet.seed);
      $('#creatingwallet').hide();
      $('.newWalletData').css('display', 'block');

  }
  $('.loadingNewWalletDiv').css('display', 'none');
  client.disconnect();
}

function saveWallet() {
  var address = $('#xrplAccount').text();
  var secret = $('#xrplSeedCode').text();
  var password = $('#passwordRegisterAccount').val();
  //var encryptedAddress = CryptoJS.AES.encrypt(address, password);
  var encryptedSecret = CryptoJS.AES.encrypt(secret, password);
  localStorage.setItem('xrplWalletAddress',address);
  localStorage.setItem('xrplWalletSecret',encryptedSecret);

  //var decrypted = CryptoJS.AES.decrypt(localStorage.getItem('xrplWalletSecret'), 'rover.perla').toString(CryptoJS.enc.Utf8);
  confirmKeySaved();
}

function confirmKeySaved() {
  localStorage.authenticated = "true";
  location.href = 'index.html';
}

function generateWalletFromPrivateKey()
{
    const privateKey = $('#pvKeyValue').val();
    const password = $('#pvKeyNewPasswordValue').val();
    if(privateKey != '' && password != '') {
      const wallet = xrpl.Wallet.fromSeed(privateKey);
      localStorage.setItem("xrplWalletAddress", wallet.address);
      var encryptedSecret = CryptoJS.AES.encrypt(privateKey, password);
      localStorage.setItem('xrplWalletSecret',encryptedSecret);
      confirmKeySaved();
    }
    else {
      $('#errorLogin').css("display","block");
      $('#errorLogin').text('The seed code and password must not be empty.');
        
    }
}


async function checkBalance()
{
  const myWallet = localStorage.getItem("xrplWalletAddress")
  await client.connect();
  try {
      const accountbalance = (await client.getXrpBalance(myWallet));
      $('.view_balance_address').text(accountbalance);
  } catch { }
  client.disconnect();
}

async function checkCurrentBlock() {
  const totalSupply = await iconServiceUtil.getTotalSupply().execute();
  $('.view_block_number').text(IconService.IconAmount.fromLoop(totalSupply));
}

function showPrivateKey() {
  var password = $('#passwordShowPV').val();
  try {
    var privateKey = CryptoJS.AES.decrypt(localStorage.getItem('xrplWalletSecret'), password).toString(CryptoJS.enc.Utf8);
    $('#privateKetShowed').text(privateKey);
  }
  catch(err) {
    alert('The password is wrong. Please, enter the right password.')
  }
  $('#passwordShowPV').val('');
  return false;
  
  
}

function logout() {
  localStorage.clear();
  location.href = 'login.html';
}

$(function()
{
  if(localStorage.getItem('xrplWalletAddress') != null) {
    checkBalance();
    //checkCurrentBlock();
    const myWallet = localStorage.getItem("xrplWalletAddress")
    //$('.current_account').qrcode(myWallet.address);
    $('.current_account_text').text(myWallet);
    // const blob = new Blob([localStorage.getItem("myWallet")], { type: 'application/json' });
    // const url = URL.createObjectURL(blob);
    // var buttonDownload = document.getElementById('downloadFile');
    // buttonDownload.href = url;
    // buttonDownload.download = 'ICONKeyStore.json';
  }

  $('#saveWallet').click(
    function() {
    saveWallet()});
  
    $('#generateWalletButton').click(
        function() {
        generateWallet()});

    $('#generateWalletPrivKeyButton').click(
        function() {
            generateWalletFromPrivateKey()});

    $('#generateWalletKeyStoreButton').click(
      function() {
        generateWalletFromKeyStore()});

    $('#confirmKeySavedButton').click(
      function() {
        confirmKeySaved()});

    $('#verifyAddressButton').click(
      function() {
        checkAddress()});
    $('#btnLogout').click(
      function() {
        logout()});

    $('#sendTrxButton').click(
      function() {
        sendTransaction()});

    $('#sendNftButton').click(
      function() {
        mintToken()});


    $('#btnShowPrivateKey').click(
        function() {
          showPrivateKey()});
    
    $('#changeNetwork').click(
      function() {
        changeNetwork()});
    
}
    
);