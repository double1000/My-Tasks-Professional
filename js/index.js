;(function() {
    var $form_add_task = $('.add-task'),
        $window = $(window),
        $body = $('body'),
        /* 删除列表项 先声明 因为在没添加进来的时候 jQuery找不到元素*/
        $task_delete_trigger,
        $task_detail_trigger,
        /*详情*/
        $task_detail = $('.task-detail'),
        //模板遮罩
        $task_detail_mask = $('.task-detail-mask'),
        //当前变量,用于详情
        current_index,
        //用于任务的更新
        $update_form,
        /*详情里面的内容元素*/
        $task_detail_content,
        /*点击详情content需要显示的元素*/
        $task_detail_content_input,
        /*选择完成状态的元素*/
        $checkbox_complete,
        $msg = $('#msg'),
        $msg_content = $msg.find('.msg-content'),
        $msg_confirm = $msg.find('button'),
        // 音乐播放控制
        $alerter,
        /* task_list保存缓存到localstroage里面的值这儿要不要好像都可以,因为页面初始化的时候就设置了*/
        task_list = [];

    init();
    /* 功能实现1:添加事件*/
    $form_add_task.on('submit', on_add_task_form_submit);
    /* 当点击遮罩的时候要隐藏 */
    $task_detail_mask.on('click', hide_task_detail);

    /*
     * 自定义的弹窗
     * */
    function pop(arg) {
        if (!arg) {
            console.error("pop title is required");
        }

        // 配置对象
        var conf = {},
            $box,
            $mask,
            $title,
            $content,
            $confirm,
            $cancel,
            dfd,
            // 储存点击的状态
            confirmed,
            timer;
        /*pormise jquery里面的方法*/
        dfd = $.Deferred();
        if (typeof arg == 'string') {
            conf.title = arg;
        } else {
            conf = $.extend(conf, arg);
        }
        $box = $(`<div>
      <div class="poptitle">${conf.title||'no title'}</div>
      <div class="popcontent">
        <div>
            <button class="primary confirm">确定</button>
            <button class="primary cancel">取消</button>
        </div>
      </div>
    </div>`)
            .css({
                "color": "#444",
                "position": "fixed",
                "width": 300,
                "padding": "20px 0",
                "background": "#fff",
                "z-index": 1001,
                "border-radius": "3px",
                "box-shadow": "0 1px 2px rgba(0,0,0,.5)"
            });

        $mask = $('<div></div>')
            .css({
                "position": "fixed",
                "top": 0,
                "left": 0,
                "bottom": 0,
                "right": 0,
                "background": "rgba(0,0,0,.7)",
                "z-index": 1000
            })

        $title = $box.find('.poptitle').css({
            "padding": "5px 10px",
            "font-weight": "900",
            "font-size": "18px",
            "text-align": "center"
        })

        $content = $box.find('.popcontent').css({
            "padding": "5px 10px",
            "text-align": "center"
        })

        $confirm = $content.find('button.confirm');
        $cancel = $content.find('button.cancel');

        $confirm.on('click', function() {
            confirmed = true;
        })

        $cancel.on('click', on_cancel);

        $mask.on('click', on_cancel);

        function on_cancel() {
            confirmed = false;
        }
        /*不断的去轮询这么一个状态,看用户点击没有*/
        timer = setInterval(function() {
            if (confirmed !== undefined) {
                dfd.resolve(confirmed);
                clearInterval(timer);
                // pop消失
                dismiss_pop();
            }
        }, 50)

        function dismiss_pop() {
            $mask.remove();
            $box.remove();
        }

        function adjust_box_position() {
            var window_width = $window.width(),
                window_height = $window.height(),
                box_width = $box.width(),
                box_height = $box.height(),
                move_x, move_y;
            move_x = (window_width - box_width) / 2;
            move_y = ((window_height - box_height) / 2) - 140;
            $box.css({
                "left": move_x + 'px',
                "top": move_y + 'px'
            })
        }
        adjust_box_position();
        $mask.appendTo($body);
        $box.appendTo($body);
        $window.on('resize', function() {
            adjust_box_position();
        });
        return dfd.promise();
    }

    /*功能实现1.2：表单submit后的添加操作*/
    function on_add_task_form_submit(e) {
        /*阻止默认事件*/
        e.preventDefault();
        /*new_task数组保存input里面的值*/
        var new_task = {};
        $input = $(this).find('input[name=content]');
        /*获取新task的值*/
        new_task.content = $input.val();
        /*如果input里面的值为空，就不执行*/
        if (!new_task.content) return;
        /*存入新的task成功后 渲染列表*/
        if (add_task(new_task)) {
            /* render_task_list(); 这儿就不需要add_task()了,因为add_task执行了一次*/
            /*每次提交事件触发过后清空input*/
            $input.val(null);
        }
    }

    /*功能实现:1-3 存入新的task函数*/
    function add_task(new_task) {
        task_list.push(new_task);
        refresh_task_list()
            /* 更新localstroage 被 refresh_task_list()检测函数代替
             store.set('task_list',task_list);*/
            // 添加成功后返回true
        return true;
    }

    /*
     * 更新view并刷新localStroage数据
     * 渲染所有模板
     * */
    function refresh_task_list() {
        store.set('task_list', task_list);
        // 更新后重新渲染
        render_task_list();
    }

    /*渲染task-list*/
    function render_task_list() {
        var $task_list = $(".task-list");
        $task_list.html(null);
        /*一个保存已完成任务的临时数组*/
        var complete_items = [];

        for (var i = 0; i < task_list.length; i++) {
            var item = task_list[i];
            if (item && item.complete) {
                complete_items[i] = item;
            } else {
                var $task = render_task_item(item, i);
                $task_list.prepend($task);
            }
        }

        for (var j = 0; j < complete_items.length; j++) {
            var item = complete_items[j]
            $task = render_task_item(item, j);
            /*这儿是循环不能跳出*/
            if (!$task) continue;
            /*添加删除类*/
            $task.addClass('completed');
            $task_list.append($task);
        }

        /*这儿循环完过后就可以获取DOM元素了*/
        $task_delete_trigger = $(".delete");
        /*循环完后获取详情*/
        $task_detail_trigger = $(".detail");
        /*获取每条列表的checkbox*/
        $checkbox_complete = $(".task-list .complete[type=checkbox]");

        /*删除事件 把变化的内容添加到监控源中去*/
        listen_task_delete();
        /*详情事件*/
        listen_task_detail();
        /*checkbox事件*/
        listen_checkbox_complete();
    }

    /*渲染单条task模板并返回出去,data用于渲染数据 index用于删除之类的一些操作*/
    function render_task_item(data, index) {
        if (!data || !index) return;
        var list_item_tpl =
            `
        <div class="task-item" data-index=${index}>
            <span><input class="complete" ${data.complete ? 'checked': ''} type="checkbox"></span>
            <span class="task-content">${data.content}</span>
            <span class="delete">delete</span>
            <span class="detail">detail</span>
        </div>
        `;
        return $(list_item_tpl);
    }

    /*定时功能*/
    function listen_msg_event() {
        $msg_confirm.on('click', function() {
            hide_msg();
        })
    }

    /*功能实现二:删除*/
    function listen_task_delete() {
        $task_delete_trigger.on('click', function() {
            var $this = $(this);
            /*找到删除按钮所在的task元素*/
            var $item = $this.parent();
            var index = $item.data('index');
            /*重点:返回promise对象*/
            pop("确定删除吗?")
                .then(function(result) {
                    result ? delete_task(index) : null;
                });
        })
    }

    /*详情监听*/
    function listen_task_detail() {
        var index;
        $('.task-item').on('dblclick', function() {
            index = $(this).data('index');
            show_task_detail(index);
        })

        $task_detail_trigger.on('click', function() {
            var $this = $(this);
            var $item = $this.parent();
            index = $item.data('index');
            show_task_detail(index)
        })
    }

    /*状态监听 listen_checkbox_complete*/
    function listen_checkbox_complete() {
        $checkbox_complete.on('click', function() {
            var $this = $(this);
            /*看看当前是否checked*/
            //var is_complete = $(this).is(':checked');
            var index = $this.parent().parent().data('index');
            var item = get(index);
            if (item.complete)
                updata_task(index, {
                    complete: false
                });
            else
                updata_task(index, {
                    complete: true
                });
        })
    }

    /* 根据index值获取task_list里面的项目*/
    function get(index) {
        return store.get('task_list')[index];
    }

    /*更新task详情*/
    function updata_task(index, data) {
        if (!index || !task_list[index]) return;
        task_list[index] = $.extend({}, task_list[index], data);
        refresh_task_list();
    }

    /*查看task详情 */
    function show_task_detail(index) {
        /*找到index后需要根据index渲染显示相应的详情 生成详情模板 */
        reader_task_detail(index);
        /*显示详情模板 默认隐藏*/
        $task_detail.show();
        /*显示遮罩 默认隐藏*/
        $task_detail_mask.show();
        /*在这儿的时候更新current_index*/
        current_index = index;
    }

    /* 渲染指定task的详细信息 */
    function reader_task_detail(index) {
        if (index === 'undefined' || !task_list[index]) return;
        var item = task_list[index];
        var tpl = `
     <form>
        <div class="content">
            ${item.content||''}
        </div>
          <div><input type="text" style="display: none;" name="content" value=${item.content}></div>
        <div>
            <div class="desc">
                <textarea name="desc">${item.desc||''}</textarea>
            </div>
        </div>

        <div class="remind">
            <label>提醒时间:</label>
            <input class="datetime" name="remind_date" value=${item.remind_date || "你还没有选择提醒时间"} type="text">
        </div>
        <div><button type="submit" id="sub">update</button></div>
    </form>
    `;
        /*先把task里面的内容全部清空,在添加*/
        $task_detail.html('');
        $task_detail.html(tpl);

        $update_form = $task_detail.find('form');
        $task_detail_content = $update_form.find('.content');
        $task_detail_content_input = $update_form.find('[name=content]');

        /*提醒时间插件挂载在上面*/
        $('.datetime').datetimepicker();

        /* 双击class为.content这个元可以修改那个标题 */
        $task_detail_content.on('dblclick', function() {
            $task_detail_content_input.show();
            $task_detail_content.hide();
        })

        /*详情更新*/
        $update_form.on('submit', function(e) {
            e.preventDefault();
            var data = {};
            data.content = $(this).find('[name=content]').val();
            data.desc = $(this).find('[name=desc]').val();
            data.remind_date = $(this).find('[name=remind_date]').val();
            /*更新task*/
            updata_task(index, data)
            hide_task_detail();
        })
    }

    /*隐藏详情和遮罩*/
    function hide_task_detail() {
        $task_detail.hide();
        $task_detail_mask.hide();
    }

    /*初始化函数*/
    function init() {
        /*
         * task_list 保存为的是一个数组
         * 获取设置task_list的值 不为空的话第一次会报错
         * */
        task_list = store.get('task_list') || [];
        /*开始的时候需要取出之前保存到localStroage里面的值然后渲染一次*/
        /*初始化的时候渲染列表一次*/
        if (task_list.length) {
            render_task_list();
        }
        task_remind_check();
        listen_msg_event();
    }

    /*监听时间*/
    function task_remind_check() {
        /*时间*/
        var current_timestamp; //得到task里面得时间戳
        var itl = setInterval(function() {
            for (var i = 0; i < task_list.length; i++) {
                var item = get(i),
                    task_timestamp;
                /*这儿一定要记得给判断 不然就不能执行下面的程序逻辑*/
                if (!item || !item.remind_date || item.informed) continue;
                /*这个得到得是一个时间戳*/
                current_timestamp = (new Date()).getTime();
                task_timestamp = (new Date(item.remind_date)).getTime();
                if (current_timestamp - task_timestamp >= 1) {
                    updata_task(i, {
                        informed: true
                    });
                    show_msg(item.content);
                }
            }
        }, 500);
    }

    /*用于提醒*/
    function show_msg(msg) {
        if (!msg) return;
        $msg_content.html(msg);
        $alerter = $(`<audio class="alerter" src="images/alert.mp3" autoplay></audio>`);
        $alerter.appendTo($body);
        $msg.show();
    }

    /*隐藏提醒*/
    function hide_msg() {
        $msg.hide();
        $alerter && $alerter.remove();
    }

    /*
     * 找到需要删除的index 删除一条task
     * parame(index) 表示需要删除的索引值
     * */
    function delete_task(index) {
        /*如果没有index或者index不存在则字节返回 不执行以后的操作*/
        if (index === 'undefined' || !task_list[index]) return;
        delete task_list[index];
        //更新localStroage
        refresh_task_list();
        // 再重新渲染一下DOM页面
        render_task_list();
    }

})()
