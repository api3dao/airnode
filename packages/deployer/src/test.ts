module.exports = {
  test: async () => {
    return {
      body: `${process.env.MASTER_KEY_MNEMONIC} ${process.env.coinlayer_coinlayerSecurityScheme}`,
      statusCode: 200,
    };
  },
};
