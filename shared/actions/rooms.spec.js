import {Map, List, fromJS} from 'immutable';
import {UserModel} from '../models/UserModel';
import {RoomModel} from '../models/RoomModel';
import {loginUserRequest, roomCreateRequest, roomJoinRequest, roomExitRequest} from '../actions/actions';

describe('Rooms:', function () {
  describe('Lifecycle:', function () {
    it('Simple Create', () => {
      const [serverStore, {clientStore0, User0}] = mockStores(1);
      clientStore0.dispatch(roomCreateRequest());
      const Room = serverStore.getState().get('rooms').first();
      expect(serverStore.getState().get('rooms'), 'serverStore.rooms').equal(Map({        [Room.id]: Room      }));
      expect(clientStore0.getState().get('room'), 'clientStore.room').equal(Room.id);
      expect(clientStore0.getState().get('rooms'), 'clientStore.rooms').equal(Map({[Room.id]: Room}));
    });

    it('Simple Join', () => {
      const [serverStore, {clientStore0, User0}, {clientStore1, User1}] = mockStores(2);
      clientStore0.dispatch(roomCreateRequest());
      const Room = serverStore.getState().get('rooms').first();
      const Room2 = new RoomModel({
        ...Room.toJS()
        , users: List([User0.id, User1.id])
      });
      clientStore1.dispatch(roomJoinRequest(Room.id));
      expect(serverStore.getState().get('rooms'), 'serverStore.rooms').equal(Map({[Room.id]: Room2}));
      expect(clientStore0.getState().get('room'), 'clientStore0.room').equal(Room.id);
      expect(clientStore0.getState().get('rooms'), 'clientStore0.rooms').equal(Map({[Room.id]: Room2}));
      expect(clientStore1.getState().get('room'), 'clientStore0.room').equal(Room.id);
      expect(clientStore1.getState().get('rooms'), 'clientStore0.rooms').equal(Map({[Room.id]: Room2}));
    });

    it('User0 creates Room, User1 logins', () => {
      const serverStore = mockServerStore();
      const clientStore0 = mockClientStore().connect(serverStore);
      const clientStore1 = mockClientStore().connect(serverStore);

      clientStore0.dispatch(loginUserRequest('/test', 'User0', 'testPassword'));
      clientStore0.dispatch(roomCreateRequest());

      const Room = serverStore.getState().get('rooms').first();

      clientStore1.dispatch(loginUserRequest('/test', 'User1', 'testPassword'));

      expect(serverStore.getState().get('rooms'), 'serverStore.rooms').equal(Map({
        [Room.id]: Room
      }));

      expect(clientStore0.getState().get('room'), 'clientStore0.room').equal(Room.id);
      expect(clientStore0.getState().get('rooms'), 'clientStore0.rooms').equal(Map({[Room.id]: Room}));

      expect(clientStore1.getState().get('room'), 'clientStore1.room').equal(null);
      expect(clientStore1.getState().get('rooms'), 'clientStore1.rooms').equal(Map({[Room.id]: Room}));
    });

    it('User0, User1 in Room, User0 exits, User1 exits', () => {
      const Room = RoomModel.new();
      const [serverStore, {clientStore0, User0}, {clientStore1, User1}]= mockStores(2, Map({rooms: Map({[Room.id]: Room})}));
      clientStore0.dispatch(roomJoinRequest(Room.id));
      clientStore1.dispatch(roomJoinRequest(Room.id));

      expect(serverStore.getState().getIn(['rooms', Room.id, 'users'])).equal(List.of(User0.id, User1.id));
      expect(clientStore0.getState().get('room'), 'clientStore0.room').equal(Room.id);
      expect(clientStore0.getState().getIn(['rooms', Room.id, 'users']), 'clientStore0.rooms').equal(List.of(User0.id, User1.id));
      expect(clientStore1.getState().get('room'), 'clientStore1.room').equal(Room.id);
      expect(clientStore1.getState().getIn(['rooms', Room.id, 'users']), 'clientStore1.rooms').equal(List.of(User0.id, User1.id));

      clientStore0.dispatch(roomExitRequest());
      //console.log(serverStore.getActions())
      //console.log('-----')
      //console.log('-----')
      //console.log('-----')
      //console.log(clientStore0.getActions())
      //console.log(serverStore.getState().toJS())
      expect(serverStore.getState().getIn(['rooms', Room.id, 'users'])).equal(List.of(User1.id));
      expect(clientStore0.getState().get('room'), 'clientStore0.room').equal(null);
      expect(clientStore1.getState().get('room'), 'clientStore1.room').equal(Room.id);
      expect(clientStore1.getState().getIn(['rooms', Room.id, 'users']), 'clientStore1.rooms').equal(List.of(User1.id));

      clientStore1.dispatch(roomExitRequest());

      expect(serverStore.getState().get('rooms')).equal(Map());
      expect(clientStore0.getState().get('room'), 'clientStore0.room').null;
      expect(clientStore0.getState().get('rooms')).equal(Map());
      expect(clientStore1.getState().get('room'), 'clientStore1.room').null;
      expect(clientStore1.getState().get('rooms')).equal(Map());
    });

    it('User0, User1 in Room, User0 disconnects, User1 disconnects', (done) => {
      const Room = RoomModel.new();
      const [serverStore, {clientStore0, User0}, {clientStore1, User1}]= mockStores(2, Map({rooms: Map({[Room.id]: Room})}));
      clientStore0.dispatch(roomJoinRequest(Room.id));
      clientStore1.dispatch(roomJoinRequest(Room.id));

      expect(serverStore.getState().getIn(['rooms', Room.id, 'users'])).equal(List.of(User0.id, User1.id));
      expect(clientStore0.getState().get('room'), 'clientStore0.room').equal(Room.id);
      expect(clientStore0.getState().getIn(['rooms', Room.id, 'users']), 'clientStore0.rooms').equal(List.of(User0.id, User1.id));
      expect(clientStore1.getState().get('room'), 'clientStore1.room').equal(Room.id);
      expect(clientStore1.getState().getIn(['rooms', Room.id, 'users']), 'clientStore1.rooms').equal(List.of(User0.id, User1.id));

      serverStore.clearActions();
      clientStore0.getClient().disconnect();
      setTimeout(() => {
        expect(serverStore.getState().getIn(['rooms', Room.id, 'users'])).equal(List.of(User1.id));
        expect(clientStore1.getState().get('room'), 'clientStore1.room').equal(Room.id);
        expect(clientStore1.getState().getIn(['rooms', Room.id, 'users']), 'clientStore1.rooms').equal(List.of(User1.id));
        clientStore1.getClient().disconnect();
        setTimeout(() => {
          expect(serverStore.getState().get('rooms')).equal(Map());
          done();
        }, 20);
      }, 20);
    });
  });
  describe('Errors:', function () {
    it('User0 rejoins into same room', () => {
      const Room = RoomModel.new();
      const [serverStore, {clientStore0, User0}]= mockStores(1, Map({rooms: Map({[Room.id]: Room})}));
      clientStore0.dispatch(roomJoinRequest(Room.id));
      clientStore0.dispatch(roomJoinRequest(Room.id));
      const newRoom = serverStore.getState().getIn(['rooms', Room.id]);
      expect(newRoom.users).equal(List.of(User0.id));
    });
  });
});