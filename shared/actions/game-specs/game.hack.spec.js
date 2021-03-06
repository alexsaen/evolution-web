import {
  roomCreateRequest,
  roomJoinRequest,
  gameCreateRequest,
  gameReadyRequest,
  gameDeployAnimalRequest,
  gameDeployTraitRequest,
} from '../actions';

describe('Hacking Game:', function () {
  it('gameReadyRequest', () => {
    const [serverStore, {clientStore0, User0}, {clientStore1, User1}, {clientStore2, User2}] = mockStores(3);
    clientStore0.dispatch(roomCreateRequest());
    const roomId = serverStore.getState().get('rooms').first().id;
    clientStore0.dispatch(roomJoinRequest(roomId));
    clientStore1.dispatch(roomJoinRequest(roomId));
    clientStore0.dispatch(gameCreateRequest(roomId));
    const ServerGame = () => serverStore.getState().get('games').first();
    const ClientGame0 = () => clientStore0.getState().get('game');
    const ClientGame1 = () => clientStore1.getState().get('game');

    // gameReadyRequest, wrong gameId
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch({
      type: 'gameReadyRequest'
      , data: {gameId: null}
      , meta: {server: true}
    }), serverStore, clientStore0);

    // gameReadyRequest, wrong user
    expectUnchanged('CHANGEIT', () => clientStore2.dispatch({
        type: 'gameReadyRequest'
        , data: {gameId: ServerGame().id, ready: true}
        , meta: {server: true}
      })
      , serverStore, clientStore2);

    // gameReadyRequest, double user
    clientStore0.dispatch(gameReadyRequest());
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch(gameReadyRequest())
      , serverStore, clientStore0);

    // gameReadyRequest, double
    clientStore1.dispatch(gameReadyRequest());
    expectUnchanged('CHANGEIT', () => clientStore1.dispatch(gameReadyRequest())
      , serverStore, clientStore1);
  });

  it('gameDeployAnimalRequest', () => {
    const [{serverStore, ServerGame, ParseGame}, {clientStore0, User0, ClientGame0}, {clientStore1, User1, ClientGame1}] = mockGame(2);
    ParseGame(`
players:
  - hand: 6 camo
  - hand: 6 camo
`);

    // gameDeployAnimalRequest empty
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch(gameDeployAnimalRequest())
      , serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:0) User1 not in turn
    expectUnchanged('CHANGEIT', () => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 0).id, 0)), serverStore, clientStore1);
    // gameDeployAnimalRequest (0:0:0) User0 turn, wrong ID
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, null)), serverStore, clientStore0);
    // gameDeployAnimalRequest (0:0:0) User0 turn, wrong ID
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, -2)), serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:0) User0 turn
    expectChanged('CHANGEIT', () => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, 0)), serverStore, clientStore0);
    expect(ServerGame().status.currentPlayer, 'ServerGame().status.currentPlayer').equal(1);

    // gameDeployAnimalRequest (0:0:1) User0 second try
    expectUnchanged('CHANGEIT', () => clientStore0.dispatch(gameDeployAnimalRequest(ClientGame0().getPlayerCard(User0, 0).id, 0))
      , serverStore, clientStore0);

    // gameDeployAnimalRequest (0:0:1) User1 turn
    expectChanged('CHANGEIT', () => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 1).id, 0)), serverStore, clientStore1);
    expect(ServerGame().status.round, 'ServerGame().status.currentPlayer').equal(1);
    expect(ServerGame().status.currentPlayer, 'ServerGame().status.currentPlayer').equal(0);

    // gameDeployAnimalRequest (0:1:0) User1 second try
    expectUnchanged('CHANGEIT', () => clientStore1.dispatch(gameDeployAnimalRequest(ClientGame1().getPlayerCard(User1, 0).id, 0))
      , serverStore, clientStore1);
  });

  it('gameDeployTraitRequest', () => {
    const [{serverStore, ServerGame, ParseGame}, {clientStore0, User0, ClientGame0}, {clientStore1, User1, ClientGame1}] = mockGame(2);
    ParseGame(`
players:
  - hand: 6 camo
    continent: $
  - hand: 6 camo
    continent: $
`);

    // gameDeployTraitRequest empty
    expectUnchanged('gameDeployTraitRequest empty', () => clientStore0.dispatch(gameDeployTraitRequest())
      , serverStore, clientStore0);

    // gameDeployTraitRequest invalid card
    expectUnchanged('gameDeployTraitRequest invalid card', () => clientStore0.dispatch(gameDeployTraitRequest(
      '123'
      , ClientGame0().getPlayer().getAnimal(0).id))
      , serverStore, clientStore0);

    // gameDeployTraitRequest invalid animal
    expectUnchanged('gameDeployTraitRequest invalid animal', () => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayer().getCard(0).id
      , '123'))
      , serverStore, clientStore0);

    // gameDeployTraitRequest valid card, valid animal
    expectChanged('gameDeployTraitRequest valid card, valid animal', () => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayer().getCard(0).id
      , ClientGame0().getPlayer().getAnimal(0).id))
      , serverStore, clientStore0);

    // wait turn
    clientStore1.dispatch(gameDeployTraitRequest(ClientGame1().getPlayer().getCard(0).id, ClientGame1().getPlayer().getAnimal(0).id));

    // gameDeployTraitRequest already has trait, valid animal
    expectUnchanged('gameDeployTraitRequest already has trait, valid animal', () => clientStore0.dispatch(gameDeployTraitRequest(
      ClientGame0().getPlayer().getCard(0).id
      , ClientGame0().getPlayer().getAnimal(0).id))
      , serverStore, clientStore0);
  });
});
















