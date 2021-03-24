import {expect} from 'chai';
import {parseTokens} from '../utils/tokens';

describe('Tokens', () => {
  it('should correctly retrieve all tokens from the @exchange-one/default-token-list', async function () {
    const allTokens = parseTokens(1666600000, 'all');
    expect(allTokens.length).to.be.greaterThan(0);
  });
});
