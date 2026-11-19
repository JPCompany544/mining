export interface Coin {
  id: string;
  name: string;
  ticker: string;
  price: string;
  change: string;
  up: boolean;
  icon: string;
}

export const COINS: Coin[] = [
  { 
    id: 'btc', 
    name: 'Bitcoin', 
    ticker: 'BTC', 
    price: '$77,958', 
    change: '+1.6%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idkbqeYUg6/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'eth', 
    name: 'Ethereum', 
    ticker: 'ETH', 
    price: '$2,143', 
    change: '+1.4%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idhZINDHvW/theme/dark/logo.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'bnb', 
    name: 'BNB', 
    ticker: 'BNB', 
    price: '$653.79', 
    change: '+2.2%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/id-pjrLx_q/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'sol', 
    name: 'Solana', 
    ticker: 'SOL', 
    price: '$86.96', 
    change: '+3.2%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/ide0NUuTHO/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'ton', 
    name: 'Toncoin', 
    ticker: 'TON', 
    price: '$2.06', 
    change: '+5.9%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/id20SzFgBn/w/400/h/400/theme/dark/icon.jpeg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'xmr', 
    name: 'Monero', 
    ticker: 'XMR', 
    price: '$403.86', 
    change: '+2.4%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idemgT5sZc/w/200/h/200/theme/dark/idW2yKIeA8.png?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'doge', 
    name: 'Dogecoin', 
    ticker: 'DOGE', 
    price: '$0.106', 
    change: '+3.0%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/ido9DnvZbc/w/400/h/400/theme/dark/icon.png?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'trx', 
    name: 'TRON', 
    ticker: 'TRX', 
    price: '$0.359', 
    change: '+1.2%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idTk2hLnxB/w/180/h/180/theme/dark/logo.png?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'ada', 
    name: 'Cardano', 
    ticker: 'ADA', 
    price: '$0.251', 
    change: '+1.1%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idCCUc6V18/w/200/h/200/theme/dark/symbol.png?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'dot', 
    name: 'Polkadot', 
    ticker: 'DOT', 
    price: '$1.29', 
    change: '+4.4%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/ide3KZT4vB/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'usdt', 
    name: 'Tether', 
    ticker: 'USDT', 
    price: '$0.999', 
    change: '+0.0%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/idpu_p285y/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'usdc', 
    name: 'USD Coin', 
    ticker: 'USDC', 
    price: '$1.000', 
    change: '-0.0%', 
    up: false, 
    icon: 'https://cdn.brandfetch.io/iduqAVaA_O/theme/dark/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'ltc', 
    name: 'Litecoin', 
    ticker: 'LTC', 
    price: '$54.39', 
    change: '+1.1%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/iduvsrUQE_/w/400/h/400/theme/dark/icon.jpeg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
  { 
    id: 'xrp', 
    name: 'Ripple', 
    ticker: 'XRP', 
    price: '$1.38', 
    change: '+1.5%', 
    up: true, 
    icon: 'https://cdn.brandfetch.io/id4BecbIFm/theme/light/symbol.svg?c=1bxeo22dfwv2aavbiluvm033f4zNejqr--q' 
  },
];

export const parseCoinPrice = (priceStr: string): number => {
  return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 1;
};
