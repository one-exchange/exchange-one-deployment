import DEFAULT_TOKEN_LIST from '@exchange-one/default-token-list';

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface Tags {}

export interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
}

export interface RootObject {
  name: string;
  timestamp: Date;
  version: Version;
  tags: Tags;
  logoURI: string;
  keywords: string[];
  tokens: Token[];
}

export function parseTokens(
  chainId: number | undefined,
  name: string
): Token[] {
  if (!chainId) return [];
  let tokens: Token[] = [];
  name = name.toLowerCase();

  const matchingTokens = DEFAULT_TOKEN_LIST.tokens.filter(
    (token) => token.chainId == chainId
  );

  if (!matchingTokens || matchingTokens.length == 0) {
    console.log(
      `Couldn't find any tokens matching the chainId ${chainId} using the default token list...`
    );
    process.exit(0);
  }

  if (name === 'all') {
    tokens = matchingTokens;
  } else {
    const matchingTokensByName = findTokensBy(matchingTokens, 'name', name);

    if (matchingTokensByName == null || matchingTokensByName.length == 0) {
      console.log(`Couldn't find any tokens matching the name ${name} ...`);
      process.exit(0);
    }

    tokens = matchingTokensByName;
  }

  return tokens;
}

export function findTokensBy(
  tokens: Token[],
  key: string,
  value: string
): Token[] {
  switch (key) {
    case 'name':
      return tokens.filter(
        (token) => token.name.toLowerCase() == value.toLowerCase()
      );
    case 'address':
      return tokens.filter(
        (token) => token.address.toLowerCase() == value.toLowerCase()
      );
    default:
      return tokens.filter(
        (token) => token.name.toLowerCase() == value.toLowerCase()
      );
  }
}
