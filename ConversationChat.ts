import { Utils } from './../../utils/Utils';
import { UsuarioService } from './../../providers/UsuarioService';
import { ChatService } from './../../providers/ChatService';
import { Usuario } from './../../entity/Usuario';
import { SpeechRecognition } from '@ionic-native/speech-recognition';
import { CookieService } from 'angular2-cookie/services/cookies.service';
import { NavParams, Navbar, Platform } from 'ionic-angular';
import { NavController } from 'ionic-angular';
import { Component, ViewChild } from '@angular/core';
import { StompService } from 'ng2-stomp-service';
import { Content } from 'ionic-angular';

@Component({
  selector: 'page-conversation-chat',
  templateUrl: 'conversation-chat.html',
  queries: {
    content: new ViewChild('content')
  }
})
export class ConversationChat {
  public receivedMsg: string;
  public connect: any;
  public crepet: any[];
  public subscription: any;
  public cookieService: CookieService;
  public url: string;
  public messages: any[];
  public msg: string;
  public user: any;
  public usuario: Usuario;
  public isTyping: boolean;
  public channelUuid: any;
  public micConversation: boolean;

  constructor(private chatService: ChatService, public navCtrl: NavController, public navParams: NavParams,
    private stomp: StompService, private usuarioService: UsuarioService, public navController: NavController, private speech: SpeechRecognition, private platform: Platform) {
    this.messages = [];
    this.isTyping = false;
    this.user = this.navParams.get("param");
    this.initService(this.navParams.get("owner"));
    this.checkingPlatform();
  }

  @ViewChild(Content) content: Content;
  @ViewChild(Navbar) navBar: Navbar;

  public checkingPlatform(){
    if (this.platform.is('core')) {
      this.micConversation = false;
    } else{
      this.micConversation = true;
    }
  }

  public scBottom() {
    setTimeout(() => {
      if (this.content._scroll) {
        this.content.scrollToBottom(300);//300ms animation speed
      }
    }, 200);
  }

 public listenForSpeech(): void {
        this.speech.startListening(Utils.androidOptions)
            .subscribe(
            data => this.msg = data[0],
            error => console.log(error + "Deu ruim")
            );
    }

  ionViewDidLoad() {
    this.navBar.backButtonClick = (e: UIEvent) => {
      this.navController.pop().then(() => this.navParams.get('resolve')(this.user));
    }
  }

  public initService(firstId) {

    this.usuario = firstId;

    this.chatService.establishChatSession(firstId.id, this.user.id)
      .subscribe(
      response => this.establishChannel(response, firstId.id),
      err => err,
      () => this.getExistingChatMessages()
      )
  }

  public establishChannel(channelDetailsPayload, id) {
    this.channelUuid = channelDetailsPayload.channelUuid;
    this.gettingToTyping(this.channelUuid, id);
    this.stomp.subscribe('/topic/private.chat.' + this.channelUuid,
      sent => this.onMessage(sent),
      err => console.log(err)
    );
  }

  public getExistingChatMessages() {
    let self = this;
    let lastPage = 0
    this.chatService.getExistingChatSessionMessages(this.channelUuid, lastPage)
      .subscribe(
      messages => this.onMensageArray(messages.content),
      err => console.log(err)
      )
  }

  onMensageArray(response) {
    let self = this;
    response.forEach(function (message) {
      self.onMessage(message);
    })
    this.scBottom();
  }

  onMessage(response) {
    this.messages
      .push({
        message: response.message,
        isFromRecipient: response.fromUserId != this.usuario.id,
        author: (response.fromUserId == this.usuario.id ? this.usuario.id : this.usuario.nome),
        type: (response.authorUser.id == this.usuario.id ? "conversationRight" : "conversationLeft"),
        timeSent: response.timeSent
      });
    this.scBottom();
  }

  public sendChatMessage(msg) {
    let self = this;
    if (this.msg == "" || this.msg == " ") return;
    let toUser = this.navParams.get('param');
    this.stomp.send("/app/private.chat." + self.channelUuid, {
      authorUser: this.usuario.id,
      recipientUser: toUser.id,
      message: msg
    });
    this.msg = "";
  }

  public submitMessage(key, msg) {
    if (key.keyCode == 13) {
      this.sendChatMessage(msg);
    }
  }

  public typingInit(typing) {
    this.isTyping = typing.isTyping;
    this.scBottom();
  }

  public gettingToTyping(channelID, id) {
    this.stomp.subscribe("/topic/typing." + channelID + "." + id,
      sent => this.typingInit(sent),
      err => console.log(err)
    )
  }

  public setTyping(key, controll) {
    if (key.keyCode != 13) {
      let typing = {
        isTyping: controll
      }
      this.stomp.send("/topic/typing." + this.channelUuid + "." + this.user.id, typing)
      let self = this;
      setTimeout(function () {
        typing.isTyping = false;
        self.stomp.send("/topic/typing." + self.channelUuid + "." + self.user.id, typing)
      }, 2000)
    }
  }


    async getPermission(): Promise<void> {
        try {
            let permission = await this.speech.requestPermission();
            return permission;
        }
        catch (e) {
            console.error(e);
        }
    }
    //
    async hasPermission(): Promise<boolean> {
        try {
            let permission = await this.speech.hasPermission();
            return permission;
        }
        catch (e) {
            console.error(e);
        }
    }
}
