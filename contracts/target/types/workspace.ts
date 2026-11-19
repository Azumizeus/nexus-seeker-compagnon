/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/workspace.json`.
 */
export type Workspace = {
  "address": "94kcYQ2jdaGWGTwd6tYwnTQspA1Nn7K7NbPFb36hBcbo",
  "metadata": {
    "name": "workspace",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptAuthority",
      "discriminator": [
        107,
        86,
        198,
        91,
        33,
        12,
        107,
        160
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "newAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "assignSharedWallet",
      "discriminator": [
        186,
        114,
        172,
        42,
        9,
        170,
        80,
        212
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "agentsMask",
          "type": "u8"
        }
      ]
    },
    {
      "name": "getEffectiveMode",
      "discriminator": [
        145,
        210,
        112,
        158,
        55,
        168,
        143,
        92
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "program",
          "address": "94kcYQ2jdaGWGTwd6tYwnTQspA1Nn7K7NbPFb36hBcbo"
        },
        {
          "name": "programData",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "program"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                2,
                168,
                246,
                145,
                78,
                136,
                161,
                176,
                226,
                16,
                21,
                62,
                247,
                99,
                174,
                43,
                0,
                194,
                185,
                61,
                22,
                193,
                36,
                210,
                192,
                83,
                122,
                16,
                4,
                128,
                0,
                0
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "guardian",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "proposeAuthority",
      "discriminator": [
        20,
        148,
        236,
        198,
        76,
        119,
        99,
        142
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "recordSpend",
      "discriminator": [
        111,
        102,
        17,
        64,
        245,
        202,
        79,
        55
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerAgentWallet",
      "discriminator": [
        40,
        57,
        22,
        0,
        76,
        120,
        80,
        243
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              },
              {
                "kind": "arg",
                "path": "walletIndex"
              }
            ]
          }
        },
        {
          "name": "walletLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
                  95,
                  108,
                  111,
                  111,
                  107,
                  117,
                  112
                ]
              },
              {
                "kind": "arg",
                "path": "walletPubkey"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "u8"
        },
        {
          "name": "walletIndex",
          "type": "u8"
        },
        {
          "name": "walletPubkey",
          "type": "pubkey"
        },
        {
          "name": "spendCapLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerSharedWallet",
      "discriminator": [
        134,
        95,
        172,
        1,
        174,
        75,
        9,
        56
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  104,
                  97,
                  114,
                  101,
                  100,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "walletIndex"
              }
            ]
          }
        },
        {
          "name": "walletLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
                  95,
                  108,
                  111,
                  111,
                  107,
                  117,
                  112
                ]
              },
              {
                "kind": "arg",
                "path": "walletPubkey"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "walletIndex",
          "type": "u8"
        },
        {
          "name": "walletPubkey",
          "type": "pubkey"
        },
        {
          "name": "assignedAgentsMask",
          "type": "u8"
        },
        {
          "name": "spendCapLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "releaseControl",
      "discriminator": [
        189,
        30,
        79,
        187,
        69,
        119,
        159,
        181
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "releaseControlForAgent",
      "discriminator": [
        247,
        108,
        122,
        136,
        221,
        28,
        48,
        30
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "resetGlobalSpent",
      "discriminator": [
        165,
        17,
        255,
        107,
        254,
        41,
        129,
        151
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "resetWalletSpent",
      "discriminator": [
        17,
        44,
        34,
        106,
        30,
        11,
        37,
        100
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "revokeAgentWallet",
      "discriminator": [
        255,
        37,
        204,
        31,
        104,
        110,
        56,
        90
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "walletLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
                  95,
                  108,
                  111,
                  111,
                  107,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "agent_wallet.wallet_pubkey",
                "account": "agentWallet"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "setGlobalSpendCap",
      "discriminator": [
        128,
        179,
        132,
        74,
        47,
        138,
        142,
        188
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newCapLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setGuardian",
      "discriminator": [
        147,
        243,
        50,
        121,
        154,
        164,
        50,
        30
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newGuardian",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setMaxWalletsPerAgent",
      "discriminator": [
        116,
        195,
        38,
        50,
        104,
        179,
        124,
        138
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "n",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setWalletMode",
      "discriminator": [
        4,
        208,
        67,
        143,
        51,
        72,
        89,
        105
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": {
            "defined": {
              "name": "walletMode"
            }
          }
        }
      ]
    },
    {
      "name": "setWalletSpendCap",
      "discriminator": [
        228,
        173,
        108,
        198,
        119,
        126,
        225,
        68
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newCapLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "takeBackControl",
      "discriminator": [
        206,
        10,
        59,
        68,
        217,
        165,
        76,
        251
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "takeBackControlForAgent",
      "discriminator": [
        52,
        104,
        66,
        226,
        109,
        97,
        11,
        229
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.seed_authority",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "agentWallet",
      "discriminator": [
        127,
        35,
        180,
        143,
        201,
        1,
        100,
        50
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "walletLookup",
      "discriminator": [
        40,
        86,
        160,
        5,
        120,
        182,
        237,
        254
      ]
    }
  ],
  "events": [
    {
      "name": "agentWalletRegistered",
      "discriminator": [
        173,
        83,
        113,
        50,
        99,
        167,
        253,
        203
      ]
    },
    {
      "name": "agentWalletRevoked",
      "discriminator": [
        205,
        209,
        138,
        224,
        113,
        238,
        233,
        67
      ]
    },
    {
      "name": "authorityAccepted",
      "discriminator": [
        166,
        192,
        219,
        188,
        41,
        209,
        195,
        26
      ]
    },
    {
      "name": "authorityProposed",
      "discriminator": [
        244,
        117,
        94,
        112,
        53,
        151,
        35,
        89
      ]
    },
    {
      "name": "configInitialized",
      "discriminator": [
        181,
        49,
        200,
        156,
        19,
        167,
        178,
        91
      ]
    },
    {
      "name": "controlReleased",
      "discriminator": [
        15,
        144,
        205,
        132,
        75,
        191,
        211,
        132
      ]
    },
    {
      "name": "controlTakenBack",
      "discriminator": [
        151,
        233,
        71,
        127,
        187,
        209,
        132,
        159
      ]
    },
    {
      "name": "effectiveMode",
      "discriminator": [
        2,
        101,
        132,
        74,
        63,
        28,
        181,
        29
      ]
    },
    {
      "name": "globalSpendCapUpdated",
      "discriminator": [
        20,
        5,
        151,
        97,
        222,
        8,
        191,
        95
      ]
    },
    {
      "name": "globalSpentReset",
      "discriminator": [
        121,
        12,
        68,
        23,
        9,
        241,
        13,
        81
      ]
    },
    {
      "name": "guardianUpdated",
      "discriminator": [
        31,
        95,
        81,
        24,
        90,
        9,
        246,
        32
      ]
    },
    {
      "name": "paused",
      "discriminator": [
        172,
        248,
        5,
        253,
        49,
        255,
        255,
        232
      ]
    },
    {
      "name": "perAgentLimitUpdated",
      "discriminator": [
        25,
        130,
        145,
        25,
        63,
        141,
        146,
        241
      ]
    },
    {
      "name": "sharedWalletAssigned",
      "discriminator": [
        16,
        175,
        172,
        232,
        187,
        27,
        222,
        248
      ]
    },
    {
      "name": "spendRecorded",
      "discriminator": [
        126,
        238,
        76,
        234,
        130,
        230,
        173,
        166
      ]
    },
    {
      "name": "unpaused",
      "discriminator": [
        156,
        150,
        47,
        174,
        120,
        216,
        93,
        117
      ]
    },
    {
      "name": "walletModeUpdated",
      "discriminator": [
        149,
        160,
        178,
        252,
        70,
        182,
        251,
        119
      ]
    },
    {
      "name": "walletSpendCapUpdated",
      "discriminator": [
        137,
        126,
        155,
        187,
        219,
        140,
        215,
        163
      ]
    },
    {
      "name": "walletSpentReset",
      "discriminator": [
        209,
        3,
        8,
        137,
        178,
        115,
        250,
        215
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "paused",
      "msg": "Program is paused"
    },
    {
      "code": 6002,
      "name": "invalidAgentId",
      "msg": "Invalid agent id"
    },
    {
      "code": 6003,
      "name": "invalidWalletIndex",
      "msg": "Invalid wallet index"
    },
    {
      "code": 6004,
      "name": "invalidAgentMask",
      "msg": "Invalid agent mask"
    },
    {
      "code": 6005,
      "name": "totalWalletLimit",
      "msg": "Total wallet limit reached"
    },
    {
      "code": 6006,
      "name": "agentWalletLimit",
      "msg": "Per-agent wallet limit reached"
    },
    {
      "code": 6007,
      "name": "sharedWalletLimit",
      "msg": "Shared wallet limit reached"
    },
    {
      "code": 6008,
      "name": "invalidPerAgentLimit",
      "msg": "Invalid per-agent limit; allowed values are 1, 2, 5, 10"
    },
    {
      "code": 6009,
      "name": "notSharedWallet",
      "msg": "Wallet is not a shared wallet"
    },
    {
      "code": 6010,
      "name": "noPendingAuthority",
      "msg": "No pending authority"
    },
    {
      "code": 6011,
      "name": "spendCapExceedsGlobal",
      "msg": "Spend cap exceeds global spend cap"
    },
    {
      "code": 6012,
      "name": "walletSpendCapExceeded",
      "msg": "Wallet spend cap exceeded"
    },
    {
      "code": 6013,
      "name": "globalSpendCapExceeded",
      "msg": "Global spend cap exceeded"
    },
    {
      "code": 6014,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "agentWallet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "u8"
          },
          {
            "name": "walletIndex",
            "type": "u8"
          },
          {
            "name": "walletPubkey",
            "type": "pubkey"
          },
          {
            "name": "isShared",
            "type": "bool"
          },
          {
            "name": "assignedAgentsMask",
            "type": "u8"
          },
          {
            "name": "mode",
            "type": {
              "defined": {
                "name": "walletMode"
              }
            }
          },
          {
            "name": "spendCapLamports",
            "type": "u64"
          },
          {
            "name": "spentLamports",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "agentWalletRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "u8"
          },
          {
            "name": "walletIndex",
            "type": "u8"
          },
          {
            "name": "walletPubkey",
            "type": "pubkey"
          },
          {
            "name": "isShared",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "agentWalletRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": "u8"
          },
          {
            "name": "walletIndex",
            "type": "u8"
          },
          {
            "name": "walletPubkey",
            "type": "pubkey"
          },
          {
            "name": "isShared",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "authorityAccepted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "previous",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "authorityProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "current",
            "type": "pubkey"
          },
          {
            "name": "proposed",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "pendingAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "guardian",
            "type": "pubkey"
          },
          {
            "name": "seedAuthority",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "maxWalletsPerAgent",
            "type": "u8"
          },
          {
            "name": "totalWallets",
            "type": "u8"
          },
          {
            "name": "sharedWallets",
            "type": "u8"
          },
          {
            "name": "walletsPerAgent",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "globalOverride",
            "type": "bool"
          },
          {
            "name": "agentOverrideMask",
            "type": "u8"
          },
          {
            "name": "globalSpendCapLamports",
            "type": "u64"
          },
          {
            "name": "globalSpentLamports",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "configInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "guardian",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "controlReleased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "controlTakenBack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "effectiveMode",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": "u8"
          },
          {
            "name": "storedMode",
            "type": {
              "defined": {
                "name": "walletMode"
              }
            }
          },
          {
            "name": "effectiveMode",
            "type": {
              "defined": {
                "name": "walletMode"
              }
            }
          }
        ]
      }
    },
    {
      "name": "globalSpendCapUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "globalSpendCapLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "globalSpentReset",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "guardianUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "guardian",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "paused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "perAgentLimitUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxWalletsPerAgent",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sharedWalletAssigned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "agentsMask",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "spendRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "u8"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "amountLamports",
            "type": "u64"
          },
          {
            "name": "walletSpentLamports",
            "type": "u64"
          },
          {
            "name": "globalSpentLamports",
            "type": "u64"
          },
          {
            "name": "effectiveMode",
            "type": {
              "defined": {
                "name": "walletMode"
              }
            }
          }
        ]
      }
    },
    {
      "name": "unpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "walletLookup",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "walletPubkey",
            "type": "pubkey"
          },
          {
            "name": "agentWallet",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "walletMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "humanValidation"
          },
          {
            "name": "agentAsks"
          },
          {
            "name": "agentAuthorized"
          }
        ]
      }
    },
    {
      "name": "walletModeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "mode",
            "type": {
              "defined": {
                "name": "walletMode"
              }
            }
          }
        ]
      }
    },
    {
      "name": "walletSpendCapUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "spendCapLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "walletSpentReset",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "previousSpentLamports",
            "type": "u64"
          },
          {
            "name": "globalSpentLamports",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
