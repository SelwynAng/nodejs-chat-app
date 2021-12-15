/*This is the client-side JS code which communicates with our server*/
//It can emit events through the 'emit' method for the server to listen through the 'on' method 
//and other way round too

const socket = io(); 
//Calling of the io global function provided by the client-side socketio code to connect to the server
//We initialise it to a 'socket' variable to allow us to call methods on it to communicate with the server

//ELEMENTS
const $messageForm = document.querySelector('#message-form');
const $messsageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $shareLocationButton = document.querySelector('#share-location');
const $messages = document.querySelector('#messages');

//TEMPLATES
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;
//We select the HTML elements in the specific script tag

//OPTIONS
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});
//Parsing the query string that appears in the searchbar of localhost:3000/chatroom.html when user types 
//their username and room and navigates to chatroom.html

//AUTOSCROLL FUNCTION
const autoscroll = () => {
    const $newMessage = $messages.lastElementChild;

    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = newMessageMargin + $newMessage.offsetHeight;

    const visibleHeight = $messages.offsetHeight;
    const containerHeight = $messages.scrollHeight;
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}
//https://medium.com/swlh/auto-scroll-in-javascript-283bdf76dc01


//FOR BASIC WELCOME MESSAGE & MESSAGE SENDING ACROSS ALL CLIENTS
//Follow the steps mentioned in index.js and chat.js
socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') 
    })
    //Mustache renders an object of key-value pairs to appear in the selected HTML template. The key is the 
    //parameter which appears in the HTML template's {{}}. The final result is saved to a constant.
    $messages.insertAdjacentHTML('beforeEnd', html);
    //The final result will be inserted into the div element for the users' messages. 'beforend' will cause
    //new messages to appear just inside the div element, after its last child.

    autoscroll();
    //STEP 2: The single socket connecting the single client to the server listens for events via the 'on' method
    //In this case, it is listening for an event titled 'message'. If such an event is emitted from the server,
    //the 2nd argument which is a callback function will do something with the contents sent over, in this case,
    //logging it on the client's console 
    //STEP 5: The client finally listens for the 'message' event emitted from the server and if such an event is
    //emitted, it will take the content of the event and log it on the client console. Done! This is the basic
    //set-up of a simple chat room
})

socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeEnd', html);
    autoscroll();
})

socket.on('roomData', (message) => { //Client listens for this event to render room and users data to browser
    const html = Mustache.render(sidebarTemplate, {
        room: message.room,
        users: message.users
    })
    document.querySelector('#chat-sidebar').innerHTML = html;
})


//STEP 3: The client can communicate with the server if something happens on the client. In this case, the client
//is trying to send some data from the user's browser when the user sends a message after clicking a submit button
//The single socket connecting the client to the server will emit an event titled 'sendUserMsg' and sends the data
//over to the server
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    $messageFormButton.setAttribute('disabled', 'disabled'); //Disables the sumbit button once it is clicked
    
    userMessage = $messsageFormInput.value;
    socket.emit('sendUserMsg', userMessage, (error) => {
        $messageFormButton.removeAttribute('disabled');  
        //Enables the submit button once the client's socket sends message over to the server
        //To prevent spamming of the submit button when client's message is in the midst of sending to the server
        $messageForm.reset(); //Resets the form after submit button is clicked so the input field is empty

        //When the client emits an event, it can utlise the ack argument (3rd argument) to receive acknowledgement
        //from the server. The server has a callback function when it listens for the same event which returns
        //an error message if there is one. If there is no error message (aka the callback is empty), the error 
        //block will not run and client console will show message delivered successfully
        if (error) {
            return console.log(error);
        }
        console.log('Message delivered!');
    });
})


//Functionality to show location of client to all other clients connected to the server using the geolocation API
$shareLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) { //If geolocation does not exist, return a browser alert
        alert('Your browser does not support sharing of your location!');
    }

    $shareLocationButton.setAttribute('disabled', 'disabled');

    //navigator.geolocation.getCurrentPosition returns the current location of the client
    //However, the function is asynchronous but since getCurrentPosition does not support promises/async-await,
    //we have to use a callback function which will have access to a position object
    navigator.geolocation.getCurrentPosition((position) => {
        let coord = {};
        coord.long = position.coords.longitude;
        coord.lat = position.coords.latitude;
        
        socket.emit('sendLocation', coord, ()=> {
            $shareLocationButton.removeAttribute('disabled');
            console.log('Location shared!');
        });
        //Client emits an event called 'sendLocation' to send over the coord object to the server
        //Had a 3rd agument (ack function) to receive the callback from the server for acknowledgement
    })
})

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error);
        location.href = '/' //To redirect the user back to the join page
    }
});
//An event which we create to send the user's username and room input to the server