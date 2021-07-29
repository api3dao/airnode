export const copyTemplate =
  // >> actions-copy-template
  {
    company: {},
    inventory: {
      __arrayItem: {
        name: {},
        quantity: {},
      },
      __actions: [
        {
          __copy: {
            __target: "[ 'backups', '[[ \\'/\\', \\'company\\' ]]' ]",
          },
        },
      ],
    },
  };
// << actions-copy-template
