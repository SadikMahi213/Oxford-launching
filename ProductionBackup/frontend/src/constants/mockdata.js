export const mockMarketPrices = {
  btc: { price: 94523.45, change: 2.34 },
  eth: { price: 3421.67, change: -1.23 },
  arb: { price: 1.89, change: 5.67 },
};

// // Mock user data
export const mockUserData = {
  fullName: "John Anderson",
  username: "john_anderson",
  email: "john.anderson@oxfordfinancialads.com",
  phone: "+1 (555) 123-4567",
  country: "United States",
  isVerified: true,
  referralLink: "https://oxfordfinancialads.com/ref/john_anderson",
  wallets: {
    main: 1250.5,
    deposit: 5000.0,
    withdraw: 1850.75,
    referral: 420.3,
    generation: 680.9,
    arbx: 100.0,
    mining: 25.5,
  },
};

// Fixed referral data — all 5 levels with real examples
export const fixedReferralData = [
  {
    level: 1,
    commissionRate: "10%",
    totalEarnings: 180.5,
    users: [
      {
        id: "l1-1",
        name: "Michael Smith",
        username: "michael_smith",
        level: 1,
        joinDate: "Dec 10, 2024",
        totalEarnings: 85.0,
        referredBy: "john_anderson",
        directReferrals: 3,
      },
      {
        id: "l1-2",
        name: "Ethan Harris",
        username: "ethan_harris",
        level: 1,
        joinDate: "Jan 4, 2025",
        totalEarnings: 60.5,
        referredBy: "john_anderson",
        directReferrals: 2,
      },
      {
        id: "l1-3",
        name: "Oliver Martinez",
        username: "oliver_martinez",
        level: 1,
        joinDate: "Jan 20, 2025",
        totalEarnings: 35.0,
        referredBy: "john_anderson",
        directReferrals: 1,
      },
    ],
  },
  {
    level: 2,
    commissionRate: "8%",
    totalEarnings: 95.2,
    users: [
      {
        id: "l2-1",
        name: "Sarah Johnson",
        username: "sarah_johnson",
        level: 2,
        joinDate: "Dec 18, 2024",
        totalEarnings: 42.0,
        referredBy: "michael_smith",
        directReferrals: 2,
      },
      {
        id: "l2-2",
        name: "Isabella Gonzalez",
        username: "isabella_gonzalez",
        level: 2,
        joinDate: "Jan 2, 2025",
        totalEarnings: 28.2,
        referredBy: "michael_smith",
        directReferrals: 1,
      },
      {
        id: "l2-3",
        name: "Mia Jackson",
        username: "mia_jackson",
        level: 2,
        joinDate: "Jan 12, 2025",
        totalEarnings: 15.0,
        referredBy: "ethan_harris",
        directReferrals: 1,
      },
      {
        id: "l2-4",
        name: "Chloe Brown",
        username: "chloe_brown",
        level: 2,
        joinDate: "Feb 1, 2025",
        totalEarnings: 10.0,

        referredBy: "oliver_martinez",
        directReferrals: 1,
      },
    ],
  },
  {
    level: 3,
    commissionRate: "7%",
    totalEarnings: 54.8,
    users: [
      {
        id: "l3-1",
        name: "David Lee",
        username: "david_lee",
        level: 3,
        joinDate: "Jan 5, 2025",
        totalEarnings: 22.5,

        referredBy: "sarah_johnson",
        directReferrals: 2,
      },
      {
        id: "l3-2",
        name: "William Rodriguez",
        username: "william_rodriguez",
        level: 3,
        joinDate: "Jan 14, 2025",
        totalEarnings: 15.3,

        referredBy: "sarah_johnson",
        directReferrals: 1,
      },
      {
        id: "l3-3",
        name: "Lucas Thompson",
        username: "lucas_thompson",
        level: 3,
        joinDate: "Jan 22, 2025",
        totalEarnings: 10.0,

        referredBy: "isabella_gonzalez",
        directReferrals: 1,
      },
      {
        id: "l3-4",
        name: "Alexander White",
        username: "alexander_white",
        level: 3,
        joinDate: "Feb 3, 2025",
        totalEarnings: 7.0,

        referredBy: "mia_jackson",
        directReferrals: 1,
      },
    ],
  },
  {
    level: 4,
    commissionRate: "6%",
    totalEarnings: 28.4,
    users: [
      {
        id: "l4-1",
        name: "Emma Wilson",
        username: "emma_wilson",
        level: 4,
        joinDate: "Jan 10, 2025",
        totalEarnings: 12.0,

        referredBy: "david_lee",
        directReferrals: 2,
      },
      {
        id: "l4-2",
        name: "James Martinez",
        username: "james_martinez",
        level: 4,
        joinDate: "Jan 19, 2025",
        totalEarnings: 8.4,

        referredBy: "david_lee",
        directReferrals: 1,
      },
      {
        id: "l4-3",
        name: "Ava Lopez",
        username: "ava_lopez",
        level: 4,
        joinDate: "Jan 25, 2025",
        totalEarnings: 5.0,

        referredBy: "william_rodriguez",
        directReferrals: 1,
      },
      {
        id: "l4-4",
        name: "Charlotte Anderson",
        username: "charlotte_anderson",
        level: 4,
        joinDate: "Feb 6, 2025",
        totalEarnings: 3.0,

        referredBy: "lucas_thompson",
        directReferrals: 1,
      },
      {
        id: "l4-5",
        name: "Amelia Taylor",
        username: "amelia_taylor",
        level: 4,
        joinDate: "Feb 10, 2025",
        totalEarnings: 0.0,

        referredBy: "alexander_white",
        directReferrals: 1,
      },
    ],
  },
  {
    level: 5,
    commissionRate: "5%",
    totalEarnings: 11.3,
    users: [
      {
        id: "l5-1",
        name: "Robert Brown",
        username: "robert_brown",
        level: 5,
        joinDate: "Jan 15, 2025",
        totalEarnings: 4.5,
        referredBy: "emma_wilson",
        directReferrals: 0,
      },
      {
        id: "l5-2",
        name: "Olivia Davis",
        username: "olivia_davis",
        level: 5,
        joinDate: "Jan 21, 2025",
        totalEarnings: 3.2,
        referredBy: "emma_wilson",
        directReferrals: 0,
      },
      {
        id: "l5-3",
        name: "Sophia Garcia",
        username: "sophia_garcia",
        level: 5,
        joinDate: "Jan 28, 2025",
        totalEarnings: 2.1,
        referredBy: "james_martinez",
        directReferrals: 0,
      },
      {
        id: "l5-4",
        name: "Benjamin Hernandez",
        username: "benjamin_hernandez",
        level: 5,
        joinDate: "Feb 2, 2025",
        totalEarnings: 1.5,
        referredBy: "ava_lopez",
        directReferrals: 0,
      },
      {
        id: "l5-5",
        name: "Noah Williams",
        username: "noah_williams",
        level: 5,
        joinDate: "Feb 8, 2025",
        totalEarnings: 0.0,
        referredBy: "charlotte_anderson",
        directReferrals: 0,
      },
    ],
  },
];

// Mock transaction data
export const generateMockTransactions = () => {
  const types = [
    "Deposit",
    "Package Purchase",
    "Profit Credit",
    "Withdrawal",
    "Referral Bonus",
    "Generation Bonus",
    "Mining Reward",
    "Admin Adjustment",
  ];
  const wallets = [
    "Main Wallet",
    "Deposit Wallet",
    "Withdraw Wallet",
    "Referral Wallet",
    "Generation Wallet",
    "OFA token Wallet",
  ];
  const statuses = ["Completed", "Pending", "Processing"];
  const currencies = ["USDT", "OFA token"];

  return Array.from({ length: 95 }, (_, i) => ({
    id: i + 1,
    date: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString(),
    type: types[Math.floor(Math.random() * types.length)],
    wallet: wallets[Math.floor(Math.random() * wallets.length)],
    amount: (Math.random() * 1000).toFixed(2),
    currency: currencies[Math.floor(Math.random() * currencies.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
};
  ///
  export const generateMockInvestments = () => {
  const baseInvestments = [
    {
      id: '1',
      userId: 'USR001',
      userName: 'John Anderson',
      userEmail: 'john.anderson@oxfordfinancialads.com',
      packageName: 'Starter Package',
      amount: 1000,
      startDate: 'Jan 15, 2026',
      endDate: 'Jul 15, 2026',
      roi: 20,
      expectedProfit: 200,
      profitPaid: 80,
      status: 'active',
      profitHistory: [
        { id: 'p1', date: 'Feb 1, 2026', amount: 40 },
        { id: 'p2', date: 'Mar 1, 2026', amount: 40 },
      ]
    },
    {
      id: '2',
      userId: 'USR002',
      userName: 'Sarah Mitchell',
      userEmail: 'sarah.mitchell@oxfordfinancialads.com',
      packageName: 'Professional Package',
      amount: 5000,
      startDate: 'Dec 20, 2025',
      endDate: 'Jun 20, 2026',
      roi: 25,
      expectedProfit: 1250,
      profitPaid: 625,
      status: 'active',
      profitHistory: [
        { id: 'p3', date: 'Jan 5, 2026', amount: 208.33 },
        { id: 'p4', date: 'Feb 5, 2026', amount: 208.33 },
        { id: 'p5', date: 'Mar 5, 2026', amount: 208.34 },
      ]
    },
    {
      id: '3',
      userId: 'USR003',
      userName: 'Michael Chen',
      userEmail: 'michael.chen@oxfordfinancialads.com',
      packageName: 'Elite Package',
      amount: 10000,
      startDate: 'Nov 1, 2025',
      endDate: 'May 1, 2026',
      roi: 30,
      expectedProfit: 3000,
      profitPaid: 3000,
      status: 'completed',
      profitHistory: [
        { id: 'p6', date: 'Dec 1, 2025', amount: 500 },
        { id: 'p7', date: 'Jan 1, 2026', amount: 500 },
        { id: 'p8', date: 'Feb 1, 2026', amount: 500 },
        { id: 'p9', date: 'Mar 1, 2026', amount: 500 },
        { id: 'p10', date: 'Apr 1, 2026', amount: 500 },
        { id: 'p11', date: 'May 1, 2026', amount: 500 },
      ]
    },
    {
      id: '4',
      userId: 'USR004',
      userName: 'Emily Rodriguez',
      userEmail: 'emily.rodriguez@oxfordfinancialads.com',
      packageName: 'Starter Package',
      amount: 2000,
      startDate: 'Feb 1, 2026',
      endDate: 'Aug 1, 2026',
      roi: 20,
      expectedProfit: 400,
      profitPaid: 133.33,
      status: 'active',
      profitHistory: [
        { id: 'p12', date: 'Mar 1, 2026', amount: 66.67 },
        { id: 'p13', date: 'Mar 4, 2026', amount: 66.66 },
      ]
    },
    {
      id: '5',
      userId: 'USR005',
      userName: 'David Kim',
      userEmail: 'david.kim@oxfordfinancialads.com',
      packageName: 'Professional Package',
      amount: 7500,
      startDate: 'Jan 10, 2026',
      endDate: 'Jul 10, 2026',
      roi: 25,
      expectedProfit: 1875,
      profitPaid: 937.5,
      status: 'active',
      profitHistory: [
        { id: 'p14', date: 'Feb 1, 2026', amount: 312.5 },
        { id: 'p15', date: 'Mar 1, 2026', amount: 312.5 },
        { id: 'p16', date: 'Mar 4, 2026', amount: 312.5 },
      ]
    },
    {
      id: '6',
      userId: 'USR006',
      userName: 'Jessica Taylor',
      userEmail: 'jessica.taylor@oxfordfinancialads.com',
      packageName: 'Starter Package',
      amount: 1500,
      startDate: 'Oct 15, 2025',
      endDate: 'Apr 15, 2026',
      roi: 20,
      expectedProfit: 300,
      profitPaid: 300,
      status: 'completed',
      profitHistory: [
        { id: 'p17', date: 'Nov 15, 2025', amount: 50 },
        { id: 'p18', date: 'Dec 15, 2025', amount: 50 },
        { id: 'p19', date: 'Jan 15, 2026', amount: 50 },
        { id: 'p20', date: 'Feb 15, 2026', amount: 50 },
        { id: 'p21', date: 'Mar 15, 2026', amount: 50 },
        { id: 'p22', date: 'Apr 15, 2026', amount: 50 },
      ]
    },
  ];

  const packages = ['Starter Package', 'Professional Package', 'Elite Package', 'Premium Package'];
  const statuses = ['active', 'completed'];

  const names = [
    'James Wilson','Olivia Brown','Robert Davis','Sophia Martinez','William Garcia',
    'Isabella Lopez','Thomas Gonzalez','Mia White','Daniel Harris','Charlotte Thompson',
    'Christopher Lee','Amelia Walker','Matthew Hall','Harper Allen','Anthony Young',
    'Evelyn King','Joshua Wright','Abigail Scott','Andrew Green','Emily Adams',
    'Joseph Baker','Elizabeth Nelson','Ryan Carter','Sofia Mitchell','Kevin Perez'
  ];

  const additionalInvestments = Array.from({ length: 25 }, (_, i) => {
    const packageName = packages[Math.floor(Math.random() * packages.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const roi =
      packageName === 'Starter Package'
        ? 20
        : packageName === 'Professional Package'
        ? 25
        : packageName === 'Elite Package'
        ? 30
        : 28;

    const amount = Math.floor(Math.random() * 15000) + 1000;
    const expectedProfit = (amount * roi) / 100;

    const profitPaid =
      status === 'completed'
        ? expectedProfit
        : Math.floor(Math.random() * expectedProfit);

    const name = names[i % names.length];

    return {
      id: String(i + 7),
      userId: `USR${String(i + 7).padStart(3, '0')}`,
      userName: name,
      userEmail: `${name.toLowerCase().replace(' ', '.')}@oxfordfinancialads.com`,
      packageName,
      amount,
      startDate: `${['Jan','Feb','Dec','Nov'][Math.floor(Math.random()*4)]} ${Math.floor(Math.random()*28)+1}, 2026`,
      endDate: `${['May','Jun','Jul','Aug'][Math.floor(Math.random()*4)]} ${Math.floor(Math.random()*28)+1}, 2026`,
      roi,
      expectedProfit,
      profitPaid,
      status,
      profitHistory:
        status === 'completed'
          ? Array.from({ length: 6 }, (_, j) => ({
              id: `p${i * 10 + j}`,
              date: `${['Jan','Feb','Mar','Apr','May','Jun'][j]} ${Math.floor(Math.random()*28)+1}, 2026`,
              amount: expectedProfit / 6
            }))
          : Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
              id: `p${i * 10 + j}`,
              date: `${['Feb','Mar'][j % 2]} ${Math.floor(Math.random()*28)+1}, 2026`,
              amount: profitPaid / (Math.floor(Math.random() * 3) + 1)
            }))
    };
  });

  return [...baseInvestments, ...additionalInvestments];
};


// user investmenet mocData
// Mock Investment Data

export const mockInvestments = [
  {
    id: '1',
    packageName: 'Starter AI Trading',
    status: 'active',
    investedAmount: 500,
    expectedProfit: 750,
    profitEarned: 125.50,
    dailyReturn: 0,
    startDate: 'Feb 15, 2026',
    endDate: 'May 15, 2026',
    durationDays: 90,
    daysElapsed: 18,
    dailyProfit: 2.78,
    profitHistory: [
      { date: 'Mar 4, 2026', amount: 2.78, type: 'Daily Profit' },
      { date: 'Mar 3, 2026', amount: 2.78, type: 'Daily Profit' },
      { date: 'Mar 2, 2026', amount: 2.78, type: 'Daily Profit' },
      { date: 'Mar 1, 2026', amount: 2.78, type: 'Daily Profit' },
      { date: 'Feb 28, 2026', amount: 2.78, type: 'Daily Profit' },
    ]
  },
  {
    id: '2',
    packageName: 'Professional DeFi Pool',
    status: 'active',
    investedAmount: 2000,
    expectedProfit: 3600,
    profitEarned: 480.00,
    dailyReturn: 0,
    startDate: 'Jan 20, 2026',
    endDate: 'Apr 20, 2026',
    durationDays: 90,
    daysElapsed: 43,
    dailyProfit: 11.16,
    profitHistory: [
      { date: 'Mar 4, 2026', amount: 11.16, type: 'Daily Profit' },
      { date: 'Mar 3, 2026', amount: 11.16, type: 'Daily Profit' },
      { date: 'Mar 2, 2026', amount: 11.16, type: 'Daily Profit' },
      { date: 'Mar 1, 2026', amount: 11.16, type: 'Daily Profit' },
      { date: 'Feb 28, 2026', amount: 11.16, type: 'Daily Profit' },
    ]
  },
  {
    id: '3',
    packageName: 'Premium Arbitrage Bot',
    status: 'active',
    investedAmount: 5000,
    expectedProfit: 10500,
    profitEarned: 1750.00,
    dailyReturn: 0,
    startDate: 'Dec 10, 2025',
    endDate: 'Jun 10, 2026',
    durationDays: 180,
    daysElapsed: 84,
    dailyProfit: 29.17,
    profitHistory: [
      { date: 'Mar 4, 2026', amount: 29.17, type: 'Daily Profit' },
      { date: 'Mar 3, 2026', amount: 29.17, type: 'Daily Profit' },
      { date: 'Mar 2, 2026', amount: 29.17, type: 'Daily Profit' },
      { date: 'Mar 1, 2026', amount: 29.17, type: 'Daily Profit' },
      { date: 'Feb 28, 2026', amount: 29.17, type: 'Daily Profit' },
    ]
  },
  {
    id: '4',
    packageName: 'Elite Market Maker',
    status: 'completed',
    investedAmount: 10000,
    expectedProfit: 25000,
    profitEarned: 25000.00,
    dailyReturn: 0,
    startDate: 'Aug 1, 2025',
    endDate: 'Feb 1, 2026',
    durationDays: 180,
    daysElapsed: 180,
    dailyProfit: 69.44,
    profitHistory: [
      { date: 'Feb 1, 2026', amount: 69.44, type: 'Daily Profit' },
      { date: 'Jan 31, 2026', amount: 69.44, type: 'Daily Profit' },
      { date: 'Jan 30, 2026', amount: 69.44, type: 'Daily Profit' },
      { date: 'Jan 29, 2026', amount: 69.44, type: 'Daily Profit' },
      { date: 'Jan 28, 2026', amount: 69.44, type: 'Daily Profit' },
    ]
  },
  {
    id: '5',
    packageName: 'Advanced Liquidity Mining',
    status: 'active',
    investedAmount: 1500,
    expectedProfit: 2400,
    profitEarned: 300.00,
    dailyReturn: 0,
    startDate: 'Feb 1, 2026',
    endDate: 'May 1, 2026',
    durationDays: 90,
    daysElapsed: 32,
    dailyProfit: 10.00,
    profitHistory: [
      { date: 'Mar 4, 2026', amount: 10.00, type: 'Daily Profit' },
      { date: 'Mar 3, 2026', amount: 10.00, type: 'Daily Profit' },
      { date: 'Mar 2, 2026', amount: 10.00, type: 'Daily Profit' },
      { date: 'Mar 1, 2026', amount: 10.00, type: 'Daily Profit' },
      { date: 'Feb 28, 2026', amount: 10.00, type: 'Daily Profit' },
    ]
  }
];



// Mock cryptocurrency data


export const popularCurrencies = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 68032.1,
    change24h: 4.21,
    icon: '₿'
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3427.16,
    change24h: 4.95,
    icon: 'Ξ'
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    price: 145.77,
    change24h: 4.25,
    icon: 'S'
  },
  {
    id: 'xrp',
    symbol: 'XRP',
    name: 'Ripple',
    price: 2.1498,
    change24h: 5.21,
    icon: 'X'
  },
  {
    id: 'bts',
    symbol: 'BTS',
    name: 'BitShares',
    price: 0.012,
    change24h: -2.27,
    icon: 'B'
  },
  {
    id: 'trx',
    symbol: 'TRX',
    name: 'Tron',
    price: 0.26078,
    change24h: -0.74,
    icon: 'T'
  },
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether',
    price: 1.0000272,
    change24h: -0.06,
    icon: '$'
  },
  {
    id: 'doge',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.38606,
    change24h: 1.24,
    icon: 'Ð'
  },
  {
    id: 'ada',
    symbol: 'ADA',
    name: 'Cardano',
    price: 1.09841,
    change24h: 3.22,
    icon: 'A'
  },
  {
    id: 'matic',
    symbol: 'MATIC',
    name: 'Polygon',
    price: 0.5146,
    change24h: 3.90,
    icon: 'M'
  }
];

export const mockPlatformStats = {
  totalUsers: 1250000,
  totalActiveInvestors: 793247,
  totalInvestmentsMade: 9884731,
  totalProfitsGenerated: 940948000,
  successfulWithdrawals: 22438296
};
