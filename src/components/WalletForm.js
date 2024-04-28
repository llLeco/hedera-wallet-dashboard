import React from 'react';
import { Button, Card } from 'react-bootstrap';

const WalletForm = ({ newWallet, isLoading, handleInputChange, addWallet }) => {
  return (
    <div>
      <Card>
        <Card.Body>
          <Card.Title>Watch a Wallet</Card.Title>
          <Card.Subtitle>Looks like you don't have any wallets saved yet</Card.Subtitle>
          <Card.Text>
            <input type="text" placeholder='Enter Hedera Wallet' value={newWallet} onChange={handleInputChange} className="form-control mb-3" />
          </Card.Text>
          <Button variant="primary" onClick={addWallet} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Add Wallet'}
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default WalletForm;
