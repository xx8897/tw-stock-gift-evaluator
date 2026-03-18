const { defineComponent } = Vue;

// ─── 葉子物品展開組件（模擬結果專用） ─────────────────────────────────────────
const SimLeafComponent = defineComponent({
    name: 'SimLeaf',
    props: { item: { type: Object, required: true } },
    data() { return { editing: false, editValue: '' } },
    methods: {
        startEdit() {
            this.editValue = this.item.resolved_base_value ?? '';
            this.editing = true;
            this.$nextTick(() => this.$refs.priceInput?.focus());
        },
        async saveEdit() {
            this.editing = false;
            const val = Number(this.editValue);
            if (isNaN(val) || val < 0) return;
            await fetch('/api/item_overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: this.item.id, base_value: val })
            });
            this.item.resolved_base_value = val;
            this.item.is_overridden = true;
        },
        async clearOverride() {
            await fetch('/api/item_overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: this.item.id, clear: true })
            });
            this.item.is_overridden = false;
        }
    },
    template: `
        <div class="sim-item">
            🍃 {{ item.name }}
            <span v-if="!editing"
                class="sim-price-tag"
                :class="{ 'sim-price-overridden': item.is_overridden }"
                @dblclick="startEdit"
                :title="item.is_overridden ? '雙擊修改（已手動覆蓋）' : '雙擊設定固定底價'">
                💰 {{ item.resolved_base_value ?? '?' }} 元
                <span v-if="item.is_overridden" class="sim-override-badge">覆蓋</span>
            </span>
            <span v-if="item.is_overridden && !editing" class="sim-clear-btn" @click="clearOverride" title="恢復繼承底價">🔄</span>
            <span v-if="!editing" class="sim-edit-btn" @click="startEdit" title="設定固定底價">✏️</span>
            <span v-if="editing" class="sim-price-edit">
                <input ref="priceInput" type="number" v-model="editValue"
                    class="sim-price-input"
                    @keyup.enter="saveEdit"
                    @keyup.esc="editing = false"
                    @blur="saveEdit"
                    min="0" step="1">
                元
            </span>
        </div>
    `
});

// ─── 樹狀節點組件（支援模擬結果顯示） ───────────────────────────────────────
const TreeNodeComponent = defineComponent({
    name: 'TreeNode',
    props: {
        node: { type: Object, required: true },
        simResults: { type: Object, default: () => ({}) }  // 模擬結果 map: node_id -> [items]
    },
    emits: ['select-node'],
    components: { draggable: window.vuedraggable, SimLeaf: SimLeafComponent },
    data() {
        return { isOpen: this.node.type === 'root' }
    },
    computed: {
        matchedItems() {
            return this.simResults[this.node.id] || [];
        }
    },
    methods: {
        toggle() {
            if (this.node.type !== 'item') this.isOpen = !this.isOpen;
        },
        select() {
            this.$emit('select-node', this.node);
        },
        forwardSelect(node) { this.$emit('select-node', node); }
    },
    template: `
        <div class="tree-node" :class="{ 'is-item': node.type === 'item' }">
            <div class="node-content" @click.stop="select">
                <!-- 拖曳控制把手 -->
                <span class="drag-handle" title="拖曳項目">≡</span>
                <span class="toggle" v-if="node.type !== 'item'" @click.stop="toggle">
                    {{ isOpen ? '🔽' : '▶️' }}
                </span>
                <span class="icon">{{ node.type === 'item' ? '🍃' : '📁' }}</span>
                <span class="name">{{ node.name }}</span>
                <span class="badge" v-if="node.type !== 'item'">({{ (node.children || []).length }})</span>
                <span class="sim-badge" v-if="matchedItems.length > 0">
                    🔍 {{ matchedItems.length }} 筆
                </span>
            </div>

            <!-- 模擬結果：可展開收合的命中物品集合 -->
            <div class="sim-results" v-if="matchedItems.length > 0" v-show="isOpen">
                <div class="sim-result-header">
                    📊 模擬結果：{{ matchedItems.length }} 件符合
                </div>
                <sim-leaf v-for="item in matchedItems" :key="item.id" :item="item"></sim-leaf>
            </div>

            <div class="node-children" v-if="node.type !== 'item'" v-show="isOpen">
                <draggable
                    class="drag-area"
                    :list="node.children || []"
                    handle=".drag-handle"
                    group="g1"
                    item-key="id">
                    <template #item="{ element }">
                        <tree-node :node="element" :sim-results="simResults" @select-node="forwardSelect"></tree-node>
                    </template>
                </draggable>
            </div>
        </div>
    `
});

// ─── 主應用程式 ───────────────────────────────────────────────────────────────
const app = Vue.createApp({
    components: {
        TreeNode: TreeNodeComponent,
        draggable: window.vuedraggable
    },
    data() {
        return {
            rawItems: [],
            treeData: null,
            rawSearch: '',
            selectedNode: null,
            parentNodeMap: new Map(),
            // 模擬結果
            simResults: {},   // node_id -> [items]
            simUnclassified: [],
            simStats: null,
            simLoading: false,
            showUnclassified: false,
            // Undo/Redo 狀態
            history: [],
            historyIndex: -1
        }
    },
    computed: {
        classifiedItemIds() {
            // 找出所有已經手動加入樹中的葉子節點
            const ids = new Set();
            const traverse = (node) => {
                if (!node) return;
                if (node.type === 'item') ids.add(String(node.id));
                if (node.children) node.children.forEach(traverse);
            };
            traverse(this.treeData);
            return ids;
        },
        leftPanelUnclassifiedItems() {
            if (!this.rawItems || !this.treeData) return [];
            const manualIds = this.classifiedItemIds;
            return this.rawItems.filter(item => {
                // 如果已經存在於樹葉中，隱藏
                if (manualIds.has(String(item.id))) return false;
                // 如果即時匹配到分類規則，隱藏
                const matchedId = this.classifyItemJS(item.name, this.treeData);
                return !matchedId;
            });
        },
        filteredRawItems() {
            let items = this.leftPanelUnclassifiedItems;
            if (!this.rawSearch) return items;
            const term = this.rawSearch.toLowerCase();
            return items.filter(item => item.name.toLowerCase().includes(term));
        },
        keywordsString: {
            get() {
                if (!this.selectedNode?.rules?.keywords) return '';
                return this.selectedNode.rules.keywords.join(', ');
            },
            set(val) {
                if (this.selectedNode?.rules) {
                    this.selectedNode.rules.keywords = val.split(',').map(s => s.trim()).filter(s => s);
                }
            }
        },
        tagsString: {
            get() {
                if (!this.selectedNode?.tags) return '';
                return this.selectedNode.tags.join(', ');
            },
            set(val) {
                if (this.selectedNode) {
                    this.selectedNode.tags = val.split(',').map(s => s.trim()).filter(s => s);
                }
            }
        },
        keywordsAndString: {
            get() {
                if (!this.selectedNode?.rules?.keywords_and) return '';
                return this.selectedNode.rules.keywords_and.join(', ');
            },
            set(val) {
                if (this.selectedNode?.rules) {
                    if (!this.selectedNode.rules.keywords_and) {
                        this.selectedNode.rules.keywords_and = [];
                    }
                    this.selectedNode.rules.keywords_and = val.split(',').map(s => s.trim()).filter(s => s);
                }
            }
        },
        keywordsNotString: {
            get() {
                if (!this.selectedNode?.rules?.keywords_not) return '';
                return this.selectedNode.rules.keywords_not.join(', ');
            },
            set(val) {
                if (this.selectedNode?.rules) {
                    if (!this.selectedNode.rules.keywords_not) {
                        this.selectedNode.rules.keywords_not = [];
                    }
                    this.selectedNode.rules.keywords_not = val.split(',').map(s => s.trim()).filter(s => s);
                }
            }
        },
        regexString: {
            get() {
                return this.selectedNode?.rules?.regex || '';
            },
            set(val) {
                if (this.selectedNode?.rules) {
                    this.selectedNode.rules.regex = val.trim() || null;
                }
            }
        }
    },
    watch: {
        treeData: {
            handler(newVal) {
                if (!newVal) return;
                
                // 防抖：避免連續輸入或拖曳瞬間產生過多歷史紀錄
                if (this.historyTimeout) clearTimeout(this.historyTimeout);
                this.historyTimeout = setTimeout(() => {
                    this.pushHistory(newVal);
                }, 400);
            },
            deep: true
        }
    },
    mounted() { 
        this.fetchData(); 
        window.addEventListener('keydown', this.handleKeydown);
    },
    beforeUnmount() {
        window.removeEventListener('keydown', this.handleKeydown);
    },
    methods: {
        async fetchData() {
            try {
                const [rawRes, treeRes] = await Promise.all([
                    fetch('/api/raw_items'),
                    fetch('/api/tree')
                ]);
                this.rawItems = await rawRes.json();
                this.treeData = await treeRes.json();
                this.buildParentMap();

                // 初始化歷史紀錄
                this.history = [JSON.stringify(this.treeData)];
                this.historyIndex = 0;
            } catch (err) {
                console.error("Failed to fetch data", err);
                alert("載入資料失敗，請確認後端已啟動。");
            }
        },
        cloneRawItem(item) {
            return {
                id: item.id,
                name: item.name,
                type: 'item',
                attributes: { base_value: null, receiving_cost: null, value_multiplier: null }
            };
        },
        
        // 前端即時預判 JS 引擎
        itemMatchesNodeJS(itemName, node) {
            const rules = node.rules || {};
            const kNot = (rules.keywords_not || []).filter(k=>k);
            const kOr = (rules.keywords || []).filter(k=>k);
            const kAnd = (rules.keywords_and || []).filter(k=>k);
            const regexStr = rules.regex || null;

            if (kNot.length > 0 && kNot.some(k => itemName.includes(k))) return { match: false };

            const hasPositiveRules = kOr.length > 0 || kAnd.length > 0 || regexStr;

            if (kOr.length > 0 && kOr.some(k => itemName.includes(k))) return { match: true };
            if (kAnd.length > 0 && kAnd.every(k => itemName.includes(k))) return { match: true };
            if (regexStr) {
                try {
                    const regex = new RegExp(regexStr, 'i');
                    if (regex.test(itemName)) return { match: true };
                } catch (e) {
                    // ignore invalid regex typing
                }
            }

            if (!hasPositiveRules) return { match: 'pass_through' };
            return { match: false };
        },
        classifyItemJS(itemName, node) {
            if (!node || node.type === 'item') return null;
            
            for (const child of (node.children || [])) {
                if (child.type === 'item') continue;
                
                const { match } = this.itemMatchesNodeJS(itemName, child);
                if (match) {
                    const deeper = this.classifyItemJS(itemName, child);
                    if (deeper) return deeper;
                    if (match === true) return child.id;
                }
            }
            return null;
        },

        selectNode(node) { this.selectedNode = node; },
        buildParentMap() {
            this.parentNodeMap.clear();
            const traverse = (node) => {
                if (node.children) {
                    node.children.forEach(child => {
                        this.parentNodeMap.set(child.id, node);
                        traverse(child);
                    });
                }
            };
            if (this.treeData) traverse(this.treeData);
        },
        addChildCategory() {
            if (!this.selectedNode || this.selectedNode.type === 'item') return;
            if (!this.selectedNode.children) this.selectedNode.children = [];
            const newNode = {
                id: 'cat_' + Date.now(),
                name: '新子分類',
                type: 'category',
                rules: { keywords: [] },
                attributes: { base_value: null, receiving_cost: null, value_multiplier: null },
                tags: [],
                children: []
            };
            this.selectedNode.children.push(newNode);
            this.buildParentMap();
        },
        deleteSelected() {
            if (!this.selectedNode || this.selectedNode.type === 'root') return;
            if (confirm(`確定要刪除 [${this.selectedNode.name}] 嗎？`)) {
                this.buildParentMap();
                const parent = this.parentNodeMap.get(this.selectedNode.id);
                if (parent?.children) {
                    parent.children = parent.children.filter(n => n.id !== this.selectedNode.id);
                    this.selectedNode = null;
                }
            }
        },
        clearNodeItems() {
            if (!this.selectedNode || !this.selectedNode.children) return;
            const itemCount = this.selectedNode.children.filter(c => c.type === 'item').length;
            if (!confirm(`確定要清空「${this.selectedNode.name}」底下的 ${itemCount} 件物品嗎？（子分類節點不受影響）`)) return;
            this.selectedNode.children = this.selectedNode.children.filter(c => c.type !== 'item');
            // 同步清掉這個節點在模擬結果中的紀錄
            if (this.simResults[this.selectedNode.id]) {
                delete this.simResults[this.selectedNode.id];
            }
            this.buildParentMap();
        },
        async saveTree() {
            try {
                const res = await fetch('/api/tree', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.treeData)
                });
                const result = await res.json();
                if (result.status === 'success') alert('儲存成功！');
                else alert('儲存失敗：' + result.message);
            } catch (err) { alert('網路錯誤'); }
        },
        async runSimulation() {
            this.simLoading = true;
            this.simResults = {};
            this.simUnclassified = [];
            this.simStats = null;
            try {
                // 先自動儲存一次樹，確保最新規則
                await fetch('/api/tree', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.treeData)
                });
                const res = await fetch('/api/simulate', { method: 'POST' });
                const result = await res.json();
                if (result.status === 'success') {
                    this.simResults = result.classified;
                    this.simUnclassified = result.unclassified;
                    this.simStats = result.stats;
                    alert(`✅ 模擬完成！\n📦 總共：${result.stats.total} 筆\n✅ 分類成功：${result.stats.classified_count} 筆\n❓ 未分類：${result.stats.unclassified_count} 筆\n\n成功分類的物品已顯示在各節點旁的「🔍 N筆」標籤上，點擊可展開查看！`);
                } else {
                    alert('模擬失敗：' + result.message);
                }
            } catch (err) {
                alert('網路錯誤：' + err);
            }
            this.simLoading = false;
        },
        async clearItems() {
            if (!confirm('確定要清空樹狀結構中所有手動放入的葉子物品嗎？\n（分類節點和關鍵字規則不受影響）')) return;
            try {
                const res = await fetch('/api/clear_items', { method: 'POST' });
                const result = await res.json();
                if (result.status === 'success') {
                    await this.fetchData();
                    this.simResults = {};
                    this.simUnclassified = [];
                    this.simStats = null;
                    alert('✅ 已清空所有葉子物品！分類規則完整保留。');
                } else {
                    alert('清空失敗：' + result.message);
                }
            } catch (err) { alert('網路錯誤'); }
        },
        // ─── Undo/Redo 方法 ───────────────────────────────────────────────────
        pushHistory(state) {
            const newStateStr = JSON.stringify(state);
            // 防呆：如果狀態沒有實質改變，或是從 undo/redo 來的，就不重複推入
            if (this.historyIndex >= 0 && this.history[this.historyIndex] === newStateStr) {
                return;
            }
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(newStateStr);
            if (this.history.length > 50) {
                this.history.shift();
            } else {
                this.historyIndex++;
            }
        },
        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                // 切斷 reference
                this.treeData = JSON.parse(this.history[this.historyIndex]);
                this.buildParentMap();
            }
        },
        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                // 切斷 reference
                this.treeData = JSON.parse(this.history[this.historyIndex]);
                this.buildParentMap();
            }
        },
        handleKeydown(e) {
            // 避免在 input 欄位裡也被攔截（除非你是想全局攔截，這裡先檢查 activeElement）
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            
            // Ctrl/Cmd + Z (復原)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    this.redo(); // Ctrl+Shift+Z (重做)
                } else {
                    if (isInput) return; // 原生 input 的 ctrl+Z 保留給它自己
                    e.preventDefault();
                    this.undo();
                }
            }
            // Ctrl/Cmd + Y (重做)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        }
    }
});

app.mount('#app');
