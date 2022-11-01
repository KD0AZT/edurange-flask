import { appendFile } from "fs";
import { render } from "less";
import studentStates from '../../states.json';
import { useState, useEffect } from "react";
import Student from '../student/student.component';
import usernameList from '../../../../../../edurange-flask/data/tmp/chatnames.json'

import { io } from 'socket.io-client';
const socket = io(`${window.location.hostname}:3001`, {autoConnect:false});

// catch-all listener for development phase
socket.onAny((event, ...args) => {
  console.log(event, args);
});

var i = 0;

/* list of dummy events */
function StudentList(props) {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [currAlert, setCurrAlert] = useState();
    const initStuds = [
        "Marco",
        "Mary",
        "Zebra",
    ];
    const [lastDate, setLastDate] = useState('0');
    const [lastFrom, setLastFrom] = useState();
    const [live, setLive] = useState(initStuds);
    const [uq, setUq] = useState([]);
    const [rq, setRq] = useState(initStuds);
    
    const [inputData, setInputData] = useState("");
    const [selectedStudent, setSelectedStudent] = useState();
    const allStudents = [];
    const usernames = usernameList;

    const statesLen = Object.keys(studentStates).length;

    // gathering student user ID / username list

  useEffect(() => {
    const uid = "000";
    socket.auth = { uid }
    socket.connect();

    socket.on('connect', () => {
      console.log("instructor HAS connected");
    });

    socket.emit("instructor connected");

    socket.on("alert", (_alert) => {
        console.log(`alert : ${JSON.stringify(_alert)}`);
      onRecvAlert(_alert);
    });

    socket.on("new message", ({messageContent, to, from}) => {

    });

    const listener = event => {
        if (event.code === "Enter" || event.code === "NumpadEnter") {
          event.preventDefault();
          if(inputData && selectedStudent) {

            socket.emit("new message", {messageContents: inputData, to: selectedStudent["uid"], from: uid});
            setInputData("");
          }
        }
      };
  
      document.addEventListener("keydown", listener);
  
    return () => {
      socket.off('connect');
      socket.off('connected students');
      document.removeEventListener("keydown", listener);
    };
  }, []);

  const onRecvAlert = (_alert) => {
    // Add id key.
    _alert["id"] = usernames[_alert["uid"] - 1] // user1 has a uid of 2.
    handleEvent(_alert);
  }

/* Contains the list of chat sessions and the 'Everyone' chat session.
 * Represent the chat sessions as: 
 * 'Everyone' is always at the top
 * Students are displayed in a queue which is updated based on students
 *      entering the chat session and new messages.
 *      Each student that is popped from the queue is re-pushed immediately.
 */ 
    const isNewer = (date1, date2) =>  {
        return date1 > date2;
    }

    const removeFromRq = (stud) => {
        let newRq = [...rq]
        var idx = newRq.indexOf(stud)
        if (idx >= 0) {
            newRq.splice(idx, 1);
            return (true, newRq)
        }
        return (false, newRq);
    }

    const removeFromUq = (stud) => {
        let newUq = [...uq]
        var idx = newUq.indexOf(stud)
        if (idx >= 0) {
            newUq.splice(idx, 1);
            return (true, newUq)
        }
        return (false, newUq)
    }
 
    const newUnread = (from) => {
        /* remove student from rq and push to uq */
        if (!uq?.includes(from)) {
            let newUq = removeFromUq(from);
            newUq.push(from)
            setUq(newUq)
        }
        let newRq = removeFromRq(from);
        setRq(newRq)
    }

    const newJoined = (stud) => {
        let newRq = [...rq]
        /* if student not in one of the queues, add to read queue */
        if (!rq?.includes(stud) && !uq?.includes(stud)) {
            newRq.push(stud);
            setRq(newRq);
        }
    }

    const chatOnClick = (stud) => {
        /* remove stud from both lists if in them, 
         * set current stud to stud
         *  push to readq
         */
        /* remove student from rq and push to uq */
        /* remove from uq regardless, append*/
        let changedRq, newRq = removeFromRq(stud);
        let changedUq, newUq = removeFromUq(stud);
        newRq.push(stud)
        setRq(newRq)
        setUq(newUq)

        // set as intended recipient for messages.
        setSelectedStudent(stud);
        console.log(selectedStudent);
    }
    
    const handleEvent = (e) => {
        console.log(`value of e : ${JSON.stringify(e)}`)
        var newDate = e["time"]
        console.assert(newDate != null)
        switch (e["type"]) {
            case "message":
                console.log(`message from: ${e["from"]}, to ${e["to"]}`)
                newUnread(e["from"]);
                break;
            case "studJoin":
                console.log(`student ${e["id"]} joined`)
                newJoined(e["id"])
                if (isNewer(newDate, lastDate)) {
                    setLastDate(newDate);
                    setLive(e["live"])
                }
                break;
            case "studLeave":
                console.log(`student ${e["id"]} left`)
                if (isNewer(newDate, lastDate)) {
                    setLastDate(newDate);
                    setLive(e["live"])
                }
                break;
        }
        console.log(`lastDate: ${lastDate}, liveStuds: ${live}`)
    }

    const msgOnClick = () => {
        if (i < statesLen) {
            var e = studentStates[i.toString()]
            ++i
            console.assert(e != null)
            handleEvent(e);
        }
    }

    const onChange = (e) => {
        setInputData(e.target.value);
      }
    
    const onFormSubmit = e => {
        e.preventDefault();
        if(inputData && selectedStudent) {
            socket.emit("new message", {messageContents: inputData, to: selectedStudent["uid"], from: uid});
            setInputData("");
        }
    }
    
    
    return (
        <div id="studentList" className="list-group w-25 overflow-auto">
        
        <div className='instrucotr-chat-input-area'>
            <form
              onSubmit={ onFormSubmit }
              autoComplete="off"
            >
              <input
                type='text'
                className="instructor-chat-input-box"
                autoComplete='off'
                onChange={ onChange }
                value= {inputData}
              />
              <button
                type="submit"
              >
              Send
              </button>

            </form>
        </div>


            <button onClick={msgOnClick}>
            Click Me
            </button>
            {uq?.map((stud) => {
                return(
                    <Student 
                        key={stud} 
                        name={stud} 
                        status="unread" 
                        onClick={chatOnClick} 
                        isLive={live?.includes(stud)}/>
                )
            })}
            {rq?.map((stud) => {
                return(
                    <Student 
                    key={stud} 
                    name={stud} 
                    status="read" 
                    onClick={chatOnClick}
                    isLive={live?.includes(stud)}/>
                )
            })}
        

        </div>
    )
}

export default StudentList;