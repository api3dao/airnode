module.exports = {
  test: async () => {
    return {
      body: `${process.env.MASTER_KEY_MNEMONIC} ${process.env.coinlayercoinlayerSecurityScheme}`,
      statusCode: 200,
    };
  },
};
