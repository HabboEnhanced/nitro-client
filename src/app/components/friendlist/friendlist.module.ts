import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/index';
import { FriendListFriendsListComponent } from './components/friends-list/friends-list.component';
import { FriendListFriendsViewerComponent } from './components/friends-viewer/friends-viewer.component';
import { FriendListMainComponent } from './components/main/main.component';
import { FriendListRequestsListComponent } from './components/requests-list/requests-list.component';
import { FriendListThreadListComponent } from './components/thread-list/thread-list.component';
import { FriendListThreadViewerComponent } from './components/thread-viewer/thread-viewer.component';
import { FriendListService } from './services/friendlist.service';

@NgModule({
    imports: [
        SharedModule
    ],
    exports: [
        FriendListFriendsListComponent,
        FriendListFriendsViewerComponent,
        FriendListMainComponent,
        FriendListRequestsListComponent,
        FriendListThreadListComponent,
        FriendListThreadViewerComponent
    ],
    providers: [
        FriendListService
    ],
    declarations: [
        FriendListFriendsListComponent,
        FriendListFriendsViewerComponent,
        FriendListMainComponent,
        FriendListRequestsListComponent,
        FriendListThreadListComponent,
        FriendListThreadViewerComponent
    ]
})
export class FriendListModule
{}