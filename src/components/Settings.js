import { getCurrentUser, getUsers, setCurrentUser, addUser, updateUser, getAppPin, setAppPin } from '../auth.js'
import { processImage } from '../image_utils.js'

export function render() {
    const currentUser = getCurrentUser()
    const users = getUsers()
    const currentKey = localStorage.getItem('gemini_api_key') || ''
    const currentPin = getAppPin()

    // Handlers
    setTimeout(() => {
        // 0. Image Upload & Delete Member Handler (Event Delegation)
        const memberList = document.querySelector('.member-list')
        if (memberList) {
            memberList.onclick = (e) => {
                const target = e.target;
                const id = target.dataset.id;

                // Edit Name
                if (target.classList.contains('edit-name-btn')) {
                    const currentName = target.dataset.name;
                    const newName = prompt('新しい名前を入力してください:', currentName);
                    if (newName && newName !== currentName) {
                        updateUser(id, { name: newName });
                        document.querySelector('[data-route=settings]').click();
                    }
                }

                // Delete Member
                if (target.classList.contains('delete-member-btn')) {
                    if (confirm('このメンバーを削除しますか？\n(元に戻せません)')) {
                        try {
                            if (id === currentUser.id) {
                                if (confirm('自分自身を削除しますか？\n削除すると、自動的に別のメンバーに切り替わります（メンバーがいなければ初期化されます）。')) {
                                    window.removeUserById(id);
                                    // If success, logic inside removeUserById helper will handle UI, but we likely need to reload or switch user.
                                    // Let's rely on the helper reloading or erroring.
                                    return;
                                }
                                return;
                            }
                            window.removeUserById(id)
                        } catch (err) {
                            alert('削除できませんでした')
                        }
                    }
                }
            }

            // File input handling is done via onchange attribute in HTML, 
            // but we can also attach here if we wanted cleaner HTML. 
            // existing handleIconUpload is global window function.
        }

        // 0. Image Upload Handler (Global)
        window.handleIconUpload = async (userId, input) => {
            if (input.files && input.files[0]) {
                try {
                    const base64 = await processImage(input.files[0], 150, 0.8) // Small for icons
                    updateUser(userId, { icon: base64 })
                    // Refresh to show change
                    document.querySelector('[data-route=settings]').click()

                    // If current user, update header immediately potentially (or full reload)
                    if (currentUser.id === userId) {
                        // Since header is static until rerender, a full reload is safer for sync
                        setTimeout(() => window.location.reload(), 500)
                    }
                } catch (e) {
                    alert('画像の処理に失敗しました 😢')
                    console.error(e)
                }
            }
        }

        // Helper for removal (since we can't easily import in block without changing top)
        // Actually, we should update the top import line in a separate call or same call if possible.
        // But for now let's rely on the module having removeUser.
        window.removeUserById = (id) => {
            import('../auth.js').then(mod => {
                try {
                    mod.removeUser(id)
                    document.querySelector('[data-route=settings]').click()
                } catch (e) {
                    alert('最後の1人は削除できません！')
                }
            })
        }


        // 0.5. Account Security Handlers
        const emailInput = document.querySelector('#email-input')
        const saveEmailBtn = document.querySelector('#save-email-btn')
        if (saveEmailBtn && emailInput) {
            saveEmailBtn.onclick = () => {
                const email = emailInput.value.trim()
                if (email) {
                    updateUser(currentUser.id, { email: email })
                    alert('メールアドレスを保存しました ✅')
                }
            }
        }

        const passwordForm = document.querySelector('#password-form')
        if (passwordForm) {
            passwordForm.onsubmit = (e) => {
                e.preventDefault()
                const newPass = passwordForm.querySelector('input[name="new-pass"]').value
                const confirmPass = passwordForm.querySelector('input[name="confirm-pass"]').value

                if (newPass && newPass === confirmPass) {
                    // In a real app, never store plain text passwords! But for this local demo:
                    updateUser(currentUser.id, { password: newPass })
                    alert('パスワードを変更しました 🔐')
                    passwordForm.reset()
                } else {
                    alert('パスワードが一致しません（または空です）❌')
                }
            }
        }

        const twoFactorToggle = document.querySelector('#2fa-toggle')
        if (twoFactorToggle) {
            twoFactorToggle.onchange = (e) => {
                const isEnabled = e.target.checked
                updateUser(currentUser.id, { twoFactorEnabled: isEnabled })
                if (isEnabled) {
                    alert('2段階認証をONにしました。\n(※現在はシミュレーションモードです)')
                }
            }
        }

        // 1. PIN Settings (App Lock)
        const pinForm = document.querySelector('#pin-form')
        if (pinForm) {
            pinForm.onsubmit = (e) => {
                e.preventDefault()
                const newPin = pinForm.querySelector('input[name="pin"]').value
                if (newPin.length === 4 && !isNaN(newPin)) {
                    setAppPin(newPin)
                    alert(`セキュリティPINを「${newPin}」に変更しました🔒`)
                    document.querySelector('[data-route=settings]').click()
                } else {
                    alert('PINは4桁の数字で入力してください⚠️')
                }
            }
        }

        // 2. Add Family Member
        const addMemberBtn = document.querySelector('#add-member-btn')
        if (addMemberBtn) {
            addMemberBtn.onclick = async () => {
                const nameInput = document.querySelector('#new-member-name')
                const fileInput = document.querySelector('#new-member-photo')
                const name = nameInput.value.trim()

                if (name) {
                    let icon = '👶' // Default
                    if (fileInput.files && fileInput.files[0]) {
                        try {
                            icon = await processImage(fileInput.files[0], 150, 0.8)
                        } catch (err) {
                            console.error("Image upload failed", err)
                        }
                    } else {
                        // Randomly select an icon from a list
                        const icons = ['👶', '👦', '👧', '👵', '👴', '👱‍♂️', '👱‍♀️', '🐕', '🐈']
                        icon = icons[Math.floor(Math.random() * icons.length)]
                    }

                    addUser(name, icon)
                    alert(`${name}さんを追加しました！🎉\n(ログイン画面から切り替えられます)`)
                    document.querySelector('[data-route=settings]').click()
                }
            }
        }

        // 3. Invite Link (Copy current URL)
        const inviteBtn = document.querySelector('#invite-btn')
        if (inviteBtn) {
            inviteBtn.onclick = async () => {
                const url = window.location.href.split('?')[0]; // Remove query params if any
                const textToCopy = `家族アプリ「Family Sync」の招待です🏠\n\n${url}\n\n(設定済みのFirebaseキーも共有してね)`;

                try {
                    await navigator.clipboard.writeText(textToCopy);
                    alert(`招待メッセージをコピーしました！📋\nLINEなどで家族に送ってあげてください。`);
                } catch (err) {
                    // Fallback for some browsers or insecure contexts
                    prompt('コピーして家族に送ってね👇', textToCopy);
                }
            }
        }

        // 4. Mobile Preview Toggle
        const mobileToggle = document.querySelector('#mobile-preview-toggle')
        if (mobileToggle) {
            // Init state
            const isMobile = localStorage.getItem('family_app_mobile_mode') === 'true'
            mobileToggle.checked = isMobile
            if (isMobile) document.body.classList.add('mobile-preview')

            mobileToggle.onchange = (e) => {
                const val = e.target.checked
                localStorage.setItem('family_app_mobile_mode', val)
                if (val) {
                    document.body.classList.add('mobile-preview')
                } else {
                    document.body.classList.remove('mobile-preview')
                }
            }
        }

        // API Key Save
        const keyInput = document.querySelector('#api-key-input')
        const saveKeyBtn = document.querySelector('#save-key-btn')
        const deleteKeyBtn = document.querySelector('#delete-key-btn')

        if (saveKeyBtn && keyInput) {
            saveKeyBtn.onclick = () => {
                const key = keyInput.value.trim()
                if (key) {
                    localStorage.setItem('gemini_api_key', key)
                    alert('✨ キーを保存しました！\nこれで「ぶーちゃん」が賢くなります。\nキーは端末内にのみ保存されます。')
                    document.querySelector('[data-route=settings]').click()
                }
            }
        }

        if (deleteKeyBtn) {
            deleteKeyBtn.onclick = () => {
                localStorage.removeItem('gemini_api_key')
                alert('🗑️ キーを削除しました。\nオフラインモードに戻ります。')
                document.querySelector('[data-route=settings]').click()
            }
        }

        // Global Firebase Save Handler (Primitive & Robust)
        window.saveFirebaseConfig = function () {
            console.log('Firebase save button clicked');
            const input = document.querySelector('#firebase-config-input');

            if (!input) {
                alert('エラー: 入力欄が見つかりません');
                return;
            }

            try {
                let jsonStr = input.value.trim();

                if (!jsonStr) {
                    if (confirm('同期設定を削除してオフラインモードに戻しますか？')) {
                        localStorage.removeItem('firebase_config');
                        window.location.reload();
                    }
                    return;
                }

                // Pre-cleaning
                if (jsonStr.startsWith('const')) {
                    jsonStr = jsonStr.substring(jsonStr.indexOf('{'));
                }
                if (jsonStr.endsWith(';')) {
                    jsonStr = jsonStr.substring(0, jsonStr.length - 1);
                }

                // Use Function constructor for loose parsing
                const config = (new Function(`return ${jsonStr}`))();

                if (!config.apiKey || !config.projectId) {
                    alert('⚠️ 不正な形式です。\napiKey または projectId が見つかりません。');
                    return;
                }

                localStorage.setItem('firebase_config', JSON.stringify(config, null, 2));
                alert('✅ 設定を保存しました！\nOKを押すとアプリを再起動します。');
                window.location.reload();

            } catch (err) {
                console.error('Config parsing error:', err);
                alert('❌ エラーが発生しました。\nコードの貼り付けミスがないか確認してください。\n\n詳細: ' + err.message);
            }
        };

        // Init Firebase Input Value
        const firebaseInput = document.querySelector('#firebase-config-input')
        const firebaseStatus = document.querySelector('#firebase-status')
        const currentFirebaseConfig = localStorage.getItem('firebase_config')
        if (firebaseInput && currentFirebaseConfig) {
            firebaseInput.value = currentFirebaseConfig
            if (firebaseStatus) firebaseStatus.textContent = '✅ 設定済み (再起動後に有効になります)'
        }

        // App Name Save
        const saveAppNameBtn = document.querySelector('#save-app-name-btn')
        if (saveAppNameBtn) {
            saveAppNameBtn.onclick = () => {
                const name = document.querySelector('#app-name-input').value.trim()
                if (name) {
                    localStorage.setItem('family_app_name', name)
                    // If empty, reset to default? No, just keep as is.
                    alert(`アプリ名を「${name}」に変更しました！🏠`)
                    window.location.reload()
                }
            }
        }

        // Data Reset
        const resetBtn = document.querySelector('#reset-data-btn')
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('【注意】\nすべてのデータ（家計簿、予定、タスクなど）が消えます。\n本当によろしいですか？')) {
                    localStorage.clear()
                    alert('データを初期化しました。再読み込みします。')
                    window.location.reload()
                }
            }
        }

    }, 0)

    // Helper to render icon (emoji or image)
    const renderIcon = (icon) => {
        if (icon.startsWith('data:image')) {
            return `<img src="${icon}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        }
        return icon
    }

    return `
    <div class="settings-container fade-in">
       <h2 style="margin-bottom: var(--space-md); text-align: center; color: var(--text-main);">設定・管理 ⚙️ <span style="font-size:0.8rem; color: var(--primary-accent); font-weight:bold;">v2.1 (NEW)</span></h2>

       <!-- My Account & Security -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); border-top: 5px solid var(--primary-accent);">
         <h3 style="font-size: 1rem; margin-bottom: 20px;">👤 アカウント・セキュリティ設定</h3>
         
         <div style="display: flex; flex-direction: column; gap: 20px;">
            <!-- Email Settings -->
            <div>
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 5px;">メールアドレス</label>
                <div style="display: flex; gap: 10px;">
                    <input type="email" id="email-input" value="${currentUser.email || ''}" placeholder="sample@example.com" style="flex: 1; border: 2px solid #eee;">
                    <button id="save-email-btn" class="btn" style="padding: 0 15px; font-size: 0.8rem; background: #eee;">保存</button>
                </div>
            </div>

            <!-- Password Settings -->
            <div style="border-top: 1px dashed #eee; padding-top: 20px;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 15px;">パスワード設定</label>
                <form id="password-form" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="password" name="new-pass" placeholder="新しいパスワード" style="border: 2px solid #eee;">
                    <div style="display: flex; gap: 10px;">
                        <input type="password" name="confirm-pass" placeholder="再入力" style="flex: 1; border: 2px solid #eee;">
                        <button type="submit" class="btn btn-primary" style="padding: 0 15px; font-size: 0.8rem;">変更</button>
                    </div>
                </form>
            </div>

            <!-- 2FA Settings -->
            <div style="border-top: 1px dashed #eee; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">2段階認証 (2FA)</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">ログイン時に認証コードを要求する</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="2fa-toggle" ${currentUser.twoFactorEnabled ? 'checked' : ''}>
                  <span class="slider round"></span>
                </label>
            </div>
         </div>
       </div>

       <!-- Family Management -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); border-top: 5px solid var(--secondary-accent);">
         <h3 style="font-size: 1rem; margin-bottom: 15px;">👨‍👩‍👧‍👦 家族の管理</h3>
         
         <div style="margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">現在のメンバー (タップで写真変更):</div>
            <div class="member-list" style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${users.map(u => `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; position: relative; width: 60px;">
                        <label for="icon-upload-${u.id}" style="cursor: pointer;">
                            <div style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: var(--shadow-sm); border: 3px solid ${u.id === currentUser.id ? 'var(--primary-accent)' : '#eee'}; overflow: hidden;">
                                ${renderIcon(u.icon)}
                            </div>
                        </label>
                        <input type="file" id="icon-upload-${u.id}" accept="image/*" style="display: none;" onchange="handleIconUpload('${u.id}', this)">
                        <div style="font-size: 0.75rem; font-weight: 700; width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${u.name} 
                            <button class="edit-name-btn" data-id="${u.id}" data-name="${u.name}" style="
                                cursor:pointer; background:none; border:none; font-size:1rem; padding:0 5px;
                            ">✏️</button>
                        </div>
                        
                        ${/* Allow delete for everyone (logic handles safety) */ ''}
                        <button class="delete-member-btn" data-id="${u.id}" style="
                            position: absolute; top: -5px; right: -5px; 
                            background: var(--danger); color: white; 
                            width: 20px; height: 20px; border-radius: 50%; 
                            border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer; z-index: 10;
                        ">×</button>
                    </div>
                `).join('')}
            </div>
         </div>
         
         <!-- Add Member with Photo -->
         <div style="background: rgba(255,255,255,0.5); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h4 style="font-size: 0.9rem; margin-bottom: 10px;">メンバーを追加</h4>
            <div id="add-member-container" style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="new-member-name" placeholder="名前 (例: ポチ)" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                <label style="font-size: 0.8rem; color: #666; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <span>📷 写真を選ぶ (任意)</span>
                    <input type="file" id="new-member-photo" accept="image/*">
                </label>
                <button id="add-member-btn" class="btn btn-primary" type="button" style="padding: 8px;">追加する</button>
            </div>
         </div>

         <button id="invite-btn" class="btn" style="width: 100%; background: white; color: var(--secondary-accent); border: 2px solid var(--secondary-accent);">
            🔗 招待リンクをコピー
         </button>
       </div>

       <!-- Security Settings -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md);">
         <h3 style="font-size: 1rem; margin-bottom: 15px;">🔒 セキュリティ設定</h3>
         <form id="pin-form" style="display: flex; align-items: center; justify-content: space-between;">
            <div>
                <div style="font-weight: 700; font-size: 0.9rem;">アプリロックPIN</div>
                <div style="font-size: 0.75rem; color: #888;">現在の設定: ${currentPin}</div>
            </div>
            <div style="display: flex; gap: 5px; align-items: center;">
                <input type="text" name="pin" maxlength="4" placeholder="New PIN" style="width: 60px; padding: 5px; text-align: center; border: 1px solid #ddd; border-radius: 4px;">
                <button type="submit" class="btn" style="padding: 5px 10px; font-size: 0.8rem;">変更</button>
            </div>
         </form>
       </div>

       <!-- AI / Privacy Status -->
       <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); border-left: 5px solid ${currentKey ? '#ffd700' : 'var(--success)'};">
         <h3 style="font-size: 1rem; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
            ${currentKey ? '🚀 AIモード有効 (Gemini)' : '🔒 オフラインモード'}
         </h3>
         <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
            <div><span style="font-weight: 700;">データの保存場所:</span> この端末の中だけ (LocalStorage)</div>
            ${currentKey
            ? '<div><span style="font-weight: 700;">外部通信:</span> <span style="color:#d48806; font-weight:700;">Google Gemini API</span> (PII除去フィルター稼働中)</div>'
            : '<div><span style="font-weight: 700;">外部通信:</span> なし (完全遮断)</div>'
        }
         </div>
       </div>
       
       <!-- Restricted Area: Admin Settings (Always Visible Now) -->
       <div id="admin-area" class="fade-in">
           <!-- API Key Settings -->
           <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);">
             <h3 style="font-size: 1rem; margin-bottom: 10px; color: var(--tertiary-accent);">🤖 AI設定 (開発者用)</h3>
             <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px; line-height: 1.5;">
                Google Gemini APIキーを設定すると、AI機能が有効になります。<br>
                <strong>⚠️ セキュリティについて:</strong><br>
                キーはブラウザ(端末)内にのみ保存されます。家族で使う分には安全ですが、このアプリを<strong>インターネット上に公開する場合は注意が必要</strong>です。<br>
                (他人にキーを使われる可能性があります)
                <br><a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--primary-accent); text-decoration: underline;">APIキーの取得はこちら(無料)</a>
                <br><span style="color: var(--success); font-weight: 700;">✅ 自動個人情報フィルタリング有効</span>
             </div>
             
             ${!currentKey ? `
                 <div style="display: flex; gap: 5px;">
                    <input type="password" id="api-key-input" placeholder="AIzaSy..." style="flex:1; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
                    <button id="save-key-btn" class="btn btn-primary" style="padding: 0 15px;">保存</button>
                 </div>
                 <p style="margin-top:5px; font-size: 0.7rem; color: #888;">※キーはブラウザに保存され、サーバーへは送信されません。</p>
             ` : `
                 <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: var(--success); font-weight: 700;">✅ 設定済み</div>
                    <button id="delete-key-btn" style="background: #fff; border: 1px solid var(--danger); color: var(--danger); padding: 5px 10px; border-radius: 4px; cursor: pointer;">設定解除</button>
                 </div>
             `}
           </div>

           <!-- Cloud Sync Settings (Firebase) -->
           <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md); background: linear-gradient(135deg, #e0f7fa 0%, #ffffff 100%);">
             <h3 style="font-size: 1rem; margin-bottom: 10px; color: #00838f;">☁️ クラウド同期設定 (Firebase)</h3>
             <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px; line-height: 1.5;">
                家族全員でデータを同期するには、Firebase(無料データベース)の設定が必要です。<br>
                <strong>設定方法:</strong><br>
                1. <a href="https://console.firebase.google.com/" target="_blank" style="color: var(--primary-accent); text-decoration: underline;">Firebase Console</a>にアクセスしてプロジェクトを作成。<br>
                2. 「ウェブアプリを追加」して出てくる設定コード(firebaseConfig)の中身(JSON)をコピー。<br>
                3. 下のボックスに貼り付けて保存。<br>
             </div>
             
            <textarea id="firebase-config-input" placeholder='{"apiKey": "...", "projectId": "..."}' style="width: 100%; height: 100px; padding: 10px; font-family: monospace; font-size: 0.8rem; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px;"></textarea>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-firebase-btn" onclick="saveFirebaseConfig()" class="btn btn-primary" style="padding: 0 15px; font-size: 0.8rem;">設定を保存＆テスト</button>
            </div>
             <p id="firebase-status" style="margin-top:5px; font-size: 0.7rem; color: #888; text-align: right;">
                ${localStorage.getItem('firebase_config') ? '✅ 設定済み (再起動後に有効になります)' : '※まだ設定されていません'}
             </p>
           </div>
    
           <!-- App Settings -->
        <div class="glass-panel" style="padding: var(--space-md); margin-bottom: var(--space-md);">
          <h3 style="font-size: 1rem; margin-bottom: 15px;">📱 表示設定</h3>
          
          <!-- App Name Setting -->
          <div style="margin-bottom: 20px; border-bottom: 1px dashed #eee; padding-bottom: 15px;">
              <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 5px;">アプリの名前 (表札)</label>
              <div style="display: flex; gap: 10px;">
                  <input type="text" id="app-name-input" value="${localStorage.getItem('family_app_name') || 'Family Sync'}" placeholder="〇〇家のホーム" style="flex: 1; border: 2px solid #eee; padding: 8px; border-radius: 4px;">
                  <button id="save-app-name-btn" class="btn" style="padding: 0 15px; font-size: 0.8rem; background: var(--magic-gold); color: #8a6d3b;">変更</button>
              </div>
          </div>

          <!-- Mobile Preview Toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
             <div>
                 <div style="font-weight: 700;">スマホ版プレビュー</div>
                 <div style="font-size: 0.8rem; color: var(--text-muted);">PCでもスマホの画面を確認できます</div>
             </div>
             <label class="switch">
               <input type="checkbox" id="mobile-preview-toggle">
               <span class="slider round"></span>
             </label>
          </div>
        </div>

       <!-- Danger Zone -->
           <div class="glass-panel" style="padding: var(--space-md); border: 2px solid var(--danger);">
             <h3 style="font-size: 1rem; margin-bottom: 10px; color: var(--danger);">⚠️ 危険なエリア</h3>
             <button id="reset-data-btn" class="btn" style="background: var(--danger); color: white; width: 100%; box-shadow: none;">すべてのデータを削除する</button>
           </div>
       </div>
       
    <style>
        /* Switch Toggle CSS */
        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--primary-accent); }
        input:checked + .slider:before { transform: translateX(24px); }
    </style>
     </div>
  `
}
