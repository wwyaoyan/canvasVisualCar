(function(){
    "use strict";
    //  全局变量

    var started = false, startScan = false;
    var addStarted = false;                          //  是否开启新增区域;
    var boundaryX = "", boundaryY = "";              //  有数据时，边界的长宽
    var doorX = "", doorY = "";                      //  设置大门

    var _startI = 0, _startJ = 0;                    //  起点的坐标
    var chess = document.getElementById("chess");    //  canvas标签
    var context = chess.getContext('2d');            //  2d绘图
    var thumbCanvas = document.getElementById("thumbCanvas");  //  缩略图canvas标签
    var thumbContext = thumbCanvas.getContext('2d');           //  2d绘图

    var flag = false;                                //  判断是否重复设区域
    var repeatX = null, repeatY = null;              //  重复区域开始数组位置的初始化

    var offsetX = 0, offsetY = 0;                    //  坐标偏移量
    var relativeX = 0, relativeY = 0;                //  相对偏移量
    var startOffsetX = 0, startOffsetY = 0;          //  鼠标按下时，记录的起点的x、y的偏移量;
    var endOffsetX = 0, endOffsetY = 0;              //  鼠标松开时，记录的终点x、y的偏移量;
    var arrayWidth = 1000, arrayHeight = 1000;       //  棋盘宽高;
    var isSaved = false;                             //  仓库范围的是否保存的状态
    var isScanMode = false, isEditMode = true;      //  浏览模式  编辑模式  布尔值状态 true开启  false关闭
    var isBoundary = false;                          //  确定划定边界范围;
    var isBoundaryX = "", isBoundaryY = "";          //  单元格的边界数
    var isDoor = false;                              //  是否可设置仓库门，true--可以, false---不可以;

    //  新增全局变量
    var KEYCODE = 18;           //  17--ctrl键，18--alt, 可自定义键位;
    var SCALE = 1;              //  动态变化倍数;
    var MIN_SCALE = 1, MAX_SCALE = 5;    //  最小缩放倍数，最大缩放倍数;
    var SCALE_BOL = false;      //  重绘时，是否缩放;
    var CELL_SIZE;              //  单元格长宽基数;
    var BASE_NUM = 30;          //  基数;
    var CELL_NUM;               //  横向和竖向单元格数量;

    var ADDAREA_LIST = [];      //  存储 新增多个区域的数组;
    var AREA_NAME_OBJ = {};     //  区域名称命名时，以名称为key，做对比使用;
    var IS_ADDAREA = false;     //  是否保存 上一次的绘制区域的数据;

    var SCALE_PREV_OX = null, SCALE_PREV_OY = null, SCALE_PREV_SIZE = null;  // 记录上一次绘制区域时的数据信息;

    //  批量删除
    var IS_MORE_DELETE_BOL = false;    //  是否开启批量删除的状态;
    var IS_MORE_DELETE = false;   //  是否开始绘制批量删除区域边界线;
    var IS_MORE_DELETE_AREA = false;  //  鼠标松开时，开启删除区域，删除区域后，状态变为false;
    var DELETE_START_X,DELETE_START_Y,DELETE_END_X,DELETE_END_Y;   //  批量删除的坐标记录;

    // URL中获取仓库ID
    var warehouseId = getUrlParam("warehouseId");

    //  input只能输入正整数的限制方法;
    addMonitorNum($(".js-watermark"));

    function addMonitorNum($m) {
        $m.on("keyup", ".js-checkInteger", function() {
            if ( !/^[1-9][0-9]{0,100}$/.test(this.value) ) {
                if ( this.value !== "" ) {
                    this.value = "";
                    $("[data-field='calculationStartDay']", $(this).closest(".js-ladderItem").next(".js-ladderItem")).val("");
                    alert("只能输入正整数");
                }
            }
            this.value = this.value.replace(/[^\d]/g,'');
        });

        $m.on("keyup", ".js-checkDecimal", function() {
            if ( !/^\d+\.?\d{0,2}$/.test(this.value) ) {
                this.value = this.value.substring(0, this.value.length-1);     //费率精确到两位小数
            }
        });
    }
    
    //获取url中的参数
    function getUrlParam(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
        var r = window.location.search.substr(1).match(reg);  //匹配目标参数
        if (r != null)
            return unescape(r[2]);
        return null; //返回参数值
    }

    //  默认二维数组;
    var tArray = new Array();
    for ( var i=0; i<arrayWidth; i++ ) {
        tArray[i] = new Array();
        for ( var j=0 ; j<arrayHeight; j++ ) {
            tArray[i][j] = null;
        }
    }

    //  画棋盘
    //绘画棋盘
    var drawChessBoard = function() {
        addStarted = false;
        ADDAREA_LIST = [];
        context.clearRect(0, 0, 750, 750);
        chess.width = 750;
        chess.height = 750;
        context.strokeStyle = "#bfbfbf";

        CELL_SIZE = BASE_NUM*SCALE;
        CELL_NUM = Math.ceil(750/CELL_SIZE);

        relativeX = 0; relativeY = 0;

        if (offsetX > 0) {
            relativeX = CELL_SIZE - offsetX % CELL_SIZE;
        }
        if (offsetY > 0) {
            relativeY = CELL_SIZE - offsetY % CELL_SIZE;
        }

        //  绘制 可视窗口内的单元格
        for (var i = 0; i < CELL_NUM; i++) {
            //横线
            context.moveTo(i * CELL_SIZE + relativeX , 0);
            context.lineTo(i * CELL_SIZE + relativeX , 750);
            context.stroke();
            //竖线
            context.moveTo(0, i * CELL_SIZE + relativeY);
            context.lineTo(750, i * CELL_SIZE + relativeY);
            context.stroke();
        }

        //  区域单元格，填充背景和内容
        for (var i=0; i<arrayWidth; i++) {
            for (var j=0; j<arrayHeight; j++) {
                if (tArray[i][j] != null) {
                    //if( IS_MORE_DELETE_BOL && IS_MORE_DELETE && IS_MORE_DELETE_AREA && j >= DELETE_START_X && j < DELETE_END_X && i >= DELETE_START_Y && i < DELETE_END_Y){
                    //  tArray[i][j] = null;
                    //}else{
                    context.fillStyle = "rgba(0,0,0,0.5)";
                    context.fillRect(j * CELL_SIZE - offsetX, i * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
                    context.fillStyle = "#fff";
                    context.font= 8*SCALE + "px Georgia";
                    context.fillText(tArray[i][j].positionName, CELL_SIZE * j -offsetX + (CELL_SIZE/10), (3*CELL_SIZE/5) + CELL_SIZE * i -offsetY);
                    //  }
                }
            }
        }

        //  画仓库边界线;
        if ( boundaryX !== "" && boundaryY !== "" ) {
            context.strokeStyle = "#ff7c6b";
            context.strokeRect(0, 0, boundaryX * CELL_SIZE - offsetX, boundaryY * CELL_SIZE - offsetY);
        }

        //  画门
        if ( doorX !== "" ) {
            var doorImg = document.getElementById("doorImg");
            context.drawImage(doorImg, (doorX-1) * CELL_SIZE - offsetX, (doorY-1) * CELL_SIZE - offsetY, CELL_SIZE*2, CELL_SIZE*2);
        }


        if (isBoundaryX !== "") {
            dotLine(isBoundaryX * CELL_SIZE - offsetX, "horizontal");
        }
        if (isBoundaryY !== "") {
            dotLine(isBoundaryY * CELL_SIZE - offsetY, "vertical");
        }

        drawThumb();
    };

    function drawThumb(){
        thumbContext.clearRect(0, 0, 400, 400);
        thumbCanvas.width = 400;
        thumbCanvas.height = 400;
        thumbContext.lineWidth = 1;
        thumbContext.strokeStyle = "#bfbfbf";

        var thumbWh = 400;
        var thumbNum = 100;
        var thumbCellSize = 4;

        // 绘制 可视窗口内的单元格
        // for (var i = 0; i < thumbNum; i++) {
        //   //横线
        //   thumbContext.moveTo(i * thumbCellSize , 0);
        //   thumbContext.lineTo(i * thumbCellSize , thumbWh);
        //   thumbContext.stroke();
        //   //竖线
        //   thumbContext.moveTo(0, i * thumbCellSize);
        //   thumbContext.lineTo(thumbWh, i * thumbCellSize);
        //   thumbContext.stroke();
        // }

        for (var i=0; i<thumbNum; i++) {
            for (var j=0; j<thumbNum; j++) {
                if (tArray[i] && tArray[i][j] != null && thumbNum != undefined) {
                    thumbContext.fillStyle = "rgba(0,0,0,0.5)";
                    thumbContext.fillRect(j * thumbCellSize, i * thumbCellSize, thumbCellSize, thumbCellSize);
                }
            }
        }

        //  画仓库边界线;
        if ( boundaryX !== "" && boundaryY !== "" ) {
            thumbContext.strokeStyle = "#ff7c6b";
            thumbContext.strokeRect(0, 0, boundaryX * thumbCellSize, boundaryY * thumbCellSize);
        }

        //  画门
        if ( doorX !== "" ) {
            var doorImg = document.getElementById("doorImg");
            thumbContext.drawImage(doorImg, (doorX-1) * thumbCellSize, (doorY-1) * thumbCellSize, thumbCellSize*2, thumbCellSize*2);
        }

        //  画边界;
        if (isBoundaryX !== "") {
            dotLineThumb(isBoundaryX * thumbCellSize, "horizontal");
        }
        if (isBoundaryY !== "") {
            dotLineThumb(isBoundaryY * thumbCellSize, "vertical");
        }

        //  绘制视图窗口;
        drawThumbWindow();
    }

    function drawThumbWindow() {
        var offsetThX = (4*offsetX)/CELL_SIZE;
        var offsetThY = (4*offsetY)/CELL_SIZE;

        var thWidth = 4*750/CELL_SIZE;
        var thHeight = 4*750/CELL_SIZE;

        //  画缩放窗口;
        thumbContext.lineWidth = "1";
        thumbContext.strokeStyle = "red";
        thumbContext.strokeRect(offsetThX,offsetThY,thWidth,thHeight);
    }

    document.onkeydown = function (e) {
        if(e.keyCode == KEYCODE){
            isScanMode = true;
            isEditMode = false;
            SCALE_BOL = true;
        }
        e.stopPropagation();
    }

    document.onkeyup = function (e) {
        isScanMode = false;
        startScan = false;
        isEditMode = true;
        SCALE_BOL = false;
        e.stopPropagation();
    }

    // 给canvas绑定鼠标滚轮事件  mac触摸板移动
    chess.addEventListener("mousewheel", function (e) {
        if(isScanMode){
            if(e.wheelDelta > 0){
                SCALE += 0.05;
            }else{
                SCALE -= 0.05;
            }

            //  限制 最大 最小的缩放倍数;
            if(SCALE < MIN_SCALE){
                SCALE = MIN_SCALE;
            }else if(SCALE > MAX_SCALE){
                SCALE = MAX_SCALE;
            }

            var ox = ((CELL_SIZE*(SCALE_PREV_OX + e.offsetX))/SCALE_PREV_SIZE)  -  e.offsetX;
            var oy = ((CELL_SIZE*(SCALE_PREV_OY + e.offsetY))/SCALE_PREV_SIZE)  -  e.offsetY;
            offsetX = ox;
            offsetY = oy;
        }else{
            offsetX += e.deltaX;
            offsetY += e.deltaY;
        }

        if (offsetX < 0) {
            offsetX = 0;
        }
        if (offsetY < 0) {
            offsetY = 0;
        }
        drawChessBoard();
        e.preventDefault();
        e.stopPropagation();
    });


    //  给canvas绑定鼠标按下事件
    chess.addEventListener("mousedown",function (e) {
        if (isScanMode) {                //  开启浏览模式
            startScan = true;
        }else if (isBoundary) {          //  划定仓库边界范围;
            if (isBoundaryX === "" && isBoundaryY == "") {
                isBoundaryX = Math.floor((e.offsetX + offsetX)/CELL_SIZE);
                dotLine(isBoundaryX * CELL_SIZE - offsetX, "horizontal");
                $(".js-tipLineX").addClass("u-hidden");
                $(".js-tipLineY").removeClass("u-hidden");
            }else if (isBoundaryX !== "" && isBoundaryY === "") {
                isBoundaryY = Math.floor((e.offsetY + offsetY)/CELL_SIZE);
                dotLine(isBoundaryY * CELL_SIZE - offsetY, "vertical");
                $(".js-tipLineY").addClass("u-hidden");
                isBoundary = false;

                setTimeout(function () {
                    if ( confirm("确定？") ) {
                        confirmBoundary();
                    }else {
                        isBoundaryX = "";
                        isBoundaryY = "";
                        drawChessBoard();
                    }
                }, 300);
            }
        }else if (isDoor) {        //   画仓库门
            var isDoorX = Math.floor((e.offsetX + offsetX)/CELL_SIZE);
            isDoor = false;
            $(".js-tipDoor").addClass("u-hidden");
            if ( isDoorX + 1 > (boundaryX - 2) ) {
                alert("大门的位置不能设在此，请重新设置！");
            }else {
                context.fillStyle = "rgba(0,0,0,0.5)";
                context.fillRect(isDoorX * CELL_SIZE - offsetX, boundaryY * CELL_SIZE - offsetY, CELL_SIZE*2, CELL_SIZE*2);
                setTimeout(function () {
                    if ( confirm("确定？") ) {
                        doorX = isDoorX + 1;
                        doorY = boundaryY + 1;
                    }
                    if (isSaved) {
                        var param = {};
                        param.warehouseId = warehouseId;
                        param.doorX = doorX;
                        param.doorY = doorY;

                        // 调用接口更新数据
                        $.ajax.post("/update.json", param, function(res) {
                        }, {isJson: true});
                    }
                    drawChessBoard();
                }, 300);
            }
        }else if( IS_MORE_DELETE_BOL){
            DELETE_START_X = null;
            DELETE_START_Y = null;
            DELETE_END_X = null;
            DELETE_END_Y = null;
            IS_MORE_DELETE = true;
            DELETE_START_X = Math.floor((e.offsetX + offsetX)/CELL_SIZE);
            DELETE_START_Y = Math.floor((e.offsetY + offsetY)/CELL_SIZE);
        }else {
            IS_ADDAREA = false;
            ADDAREA_LIST = [];
            flag = false;      //  未重复时，计算偏移量;
            startOffsetX = e.offsetX;
            startOffsetY = e.offsetY;
            _startI = Math.floor((e.offsetX-relativeX) / CELL_SIZE);
            _startJ = Math.floor((e.offsetY-relativeY) / CELL_SIZE);
            started = true;
        }
    },false);


    //  给canvas绑定鼠标移动事件,鼠标移除canvas时，解除浏览模式的拖动状态;
    chess.addEventListener("mouseout",function (e) {
        startScan = false;
        e.stopPropagation();
    },false);

    chess.addEventListener("mousemove",function (e) {
        if (isScanMode) {        //  浏览模式下的鼠标移动;
            if(startScan){
                offsetX -= e.movementX;
                if (offsetX < 0) {
                    offsetX = 0;
                }
                offsetY -= e.movementY;
                if (offsetY < 0) {
                    offsetY = 0;
                }
                context.clearRect(0, 0, 750, 750);
                drawChessBoard();
            }
            e.stopPropagation();
        }else if (started) {      //   编辑模式下的鼠标移动

            IS_ADDAREA = true;
            var x = Math.floor((e.offsetX-relativeX) / CELL_SIZE);
            var y = Math.floor((e.offsetY-relativeY) / CELL_SIZE);
            drawChessBoard();

            context.fillStyle = "rgba(0, 0, 0, 0.5)";
            context.fillRect(_startI * CELL_SIZE + relativeX, _startJ * CELL_SIZE + relativeY, (x-_startI+1)*CELL_SIZE, (y-_startJ+1)*CELL_SIZE);

        }else if(IS_MORE_DELETE_BOL){
            if(IS_MORE_DELETE){
                DELETE_END_X = Math.floor((e.offsetX + offsetX)/CELL_SIZE);
                DELETE_END_Y = Math.floor((e.offsetY + offsetY)/CELL_SIZE);
                drawChessBoard();
                if(DELETE_END_X >= DELETE_START_X && DELETE_END_Y >= DELETE_START_Y){
                    dotDeleteLine(DELETE_START_X*CELL_SIZE,DELETE_START_Y*CELL_SIZE,DELETE_END_X*CELL_SIZE,DELETE_START_Y*CELL_SIZE);
                    dotDeleteLine(DELETE_START_X*CELL_SIZE,DELETE_START_Y*CELL_SIZE,DELETE_START_X*CELL_SIZE,DELETE_END_Y*CELL_SIZE);
                    dotDeleteLine(DELETE_START_X*CELL_SIZE,DELETE_END_Y*CELL_SIZE,DELETE_END_X*CELL_SIZE,DELETE_END_Y*CELL_SIZE);
                    dotDeleteLine(DELETE_END_X*CELL_SIZE,DELETE_START_Y*CELL_SIZE,DELETE_END_X*CELL_SIZE,DELETE_END_Y*CELL_SIZE);
                }
            }
        }

        SCALE_PREV_OX = offsetX;
        SCALE_PREV_OY = offsetY;
        SCALE_PREV_SIZE = CELL_SIZE;

    },false);


    //  给canvas绑定 松开鼠标 事件
    chess.addEventListener("mouseup",function (e) {
        if (startScan) {
            startScan = false;
        }else if (started) {     //   鼠标松开时，检验选择区域是否有重复、是否超出边界;
            endOffsetX = e.offsetX;
            endOffsetY = e.offsetY;
            started = false;
            var flagRepeat = false;

            var startI = Math.floor((startOffsetY + offsetY)/CELL_SIZE);
            var startJ = Math.floor((startOffsetX + offsetX)/CELL_SIZE);
            var endI = Math.floor((endOffsetY + offsetY)/CELL_SIZE);
            var endJ = Math.floor((endOffsetX + offsetX)/CELL_SIZE);

            if ( (boundaryX !== "" && boundaryY !== "") && ((Math.floor(e.offsetX + offsetX)/CELL_SIZE) > boundaryX || (Math.floor(e.offsetY + offsetY)/CELL_SIZE) > boundaryY) ) {
                drawChessBoard();
                alert("您选中的区域已超出边界，请重新选择！");
                return false;
            }else {
                for (var i = startI; i<endI+1; i++) {
                    for (var j=startJ; j<endJ+1; j++) {
                        if (tArray[i][j] !== null) {
                            flagRepeat = true;
                        }
                    }
                }

                if(flagRepeat){
                    drawChessBoard();
                    alert("选择的区域中有重复区域");
                    return false;
                }else{
                    addStarted = true;
                }
            }

            if(!addStarted){
                return false;
            }

            var areaObj = new Object();
            areaObj["startI"] = startI;
            areaObj["startJ"] = startJ;
            areaObj["endI"] = endI;
            areaObj["endJ"] = endJ;
            ADDAREA_LIST.push(areaObj);

        }else if(IS_MORE_DELETE_BOL){
            if(IS_MORE_DELETE){
                IS_MORE_DELETE_AREA = true;
                deleteMoreArea(DELETE_START_X,DELETE_START_Y,DELETE_END_X,DELETE_END_Y);
            }
        }
    },false);


    function deleteMoreArea(DELETE_START_X,DELETE_START_Y,DELETE_END_X,DELETE_END_Y){
        var deleteArray = {};
        deleteArray.warehouseId = warehouseId;
        deleteArray.areaPositionIds = [];


        if(isSaved){
            var bol = true;
            for (var x=DELETE_START_X; x<DELETE_END_X; x++) {
                for (var y=DELETE_START_Y; y<DELETE_END_Y; y++) {
                    if(tArray[y][x] != null && tArray[y][x].hasOwnProperty("areaPositionId") && tArray[y][x].areaPositionId != ""){
                        deleteArray.areaPositionIds.push(tArray[y][x].areaPositionId);
                    }
                }
            }

            if(deleteArray.areaPositionIds.length == 0){
                bol = false;
            }

            if(bol){
                if(confirm("确定删除所选库位？")){
                    // 调用接口删除数据库中此库位的相应数据
                    $.ajax.post("/delete.json", deleteArray, function(res) {
                        for (var x=DELETE_START_X; x<DELETE_END_X; x++) {
                            for (var y=DELETE_START_Y; y<DELETE_END_Y; y++) {
                                tArray[y][x] = null;
                            }
                        }
                        drawChessBoard(); // 画棋盘
                        DELETE_START_X = null;
                        DELETE_START_Y = null;
                        DELETE_END_X = null;
                        DELETE_END_Y = null;
                        IS_MORE_DELETE = false;
                        IS_MORE_DELETE_AREA = false;
                    }, {isJson: true});
                }else{
                    drawChessBoard(); // 画棋盘
                    DELETE_START_X = null;
                    DELETE_START_Y = null;
                    DELETE_END_X = null;
                    DELETE_END_Y = null;
                    IS_MORE_DELETE = false;
                    IS_MORE_DELETE_AREA = false;
                }
            }else{
                drawChessBoard(); // 画棋盘
                DELETE_START_X = null;
                DELETE_START_Y = null;
                DELETE_END_X = null;
                DELETE_END_Y = null;
                IS_MORE_DELETE = false;
                IS_MORE_DELETE_AREA = false;
            }

        }else{
            for (var x=DELETE_START_X; x<DELETE_END_X; x++) {
                for (var y=DELETE_START_Y; y<DELETE_END_Y; y++) {
                    if(tArray[y][x] != null && tArray[y][x].hasOwnProperty("positionName") && tArray[y][x].positionName != ""){
                        deleteArray.areaPositionIds.push(tArray[y][x].positionName);
                    }
                }
            }

            if(deleteArray.areaPositionIds.length > 0){
                if(confirm("确定删除所选库位？")){
                    for (var x=DELETE_START_X; x<DELETE_END_X; x++) {
                        for (var y=DELETE_START_Y; y<DELETE_END_Y; y++) {
                            tArray[y][x] = null;
                        }
                    }
                    drawChessBoard(); // 画棋盘
                    DELETE_START_X = null;
                    DELETE_START_Y = null;
                    DELETE_END_X = null;
                    DELETE_END_Y = null;
                    IS_MORE_DELETE = false;
                    IS_MORE_DELETE_AREA = false;
                }else{
                    drawChessBoard(); // 画棋盘
                    DELETE_START_X = null;
                    DELETE_START_Y = null;
                    DELETE_END_X = null;
                    DELETE_END_Y = null;
                    IS_MORE_DELETE = false;
                    IS_MORE_DELETE_AREA = false;
                }
            }else{
                drawChessBoard(); // 画棋盘
                DELETE_START_X = null;
                DELETE_START_Y = null;
                DELETE_END_X = null;
                DELETE_END_Y = null;
                IS_MORE_DELETE = false;
                IS_MORE_DELETE_AREA = false;
            }
        }

    }



    //  给canvas绑定鼠标移入事件
    chess.addEventListener("mouseenter", function () {
        $(".Page-content").css("overflow-y", "hidden");
    });

    //  给canvas绑定鼠标移出事件
    chess.addEventListener("mouseleave", function () {
        $(".Page-content").css("overflow-y", "auto");
    });

    //获取字符串"-"前的字符
    function getIndexName(str) {
        return str.substring(str.indexOf("\-"), 0);
    }

    //获取两个字符"-"之间的字符串
    function getIndexX(str) {
        return str.match(/-(\S*)-/)[1];
    }

    //获取字符串总最后一个"-"之后的字符串
    function getIndexY(str) {
        return str.substring(str.lastIndexOf("\-") + 1, str.length);
    }

    function getAreaStartEnd(arr){     //   获取单个区域的区域块 起点单元格坐标和终点单元格坐标
        var obj = {
            "i":0,
            "j":0
        };
        var arrItem = arr[0];
        for(var i=arrItem.startI; i<arrItem.endI+1; i++){
            obj["i"]++;
        }
        for(var j=arrItem.startJ; j<arrItem.endJ+1; j++){
            obj["j"]++;
        }

        var result = Object.assign(obj,arrItem);
        return result;
    }


    function sortNumber(a,b){
        return a - b;
    }

    // 初始化保存数据
    function initSavedData(res) {
        tArray = res.areaPositions;
        arrayWidth = parseInt(res.width);
        arrayHeight = parseInt(res.length);
        boundaryX = arrayHeight;
        boundaryY = arrayWidth;
        doorX = parseInt(res.doorX);
        doorY = parseInt(res.doorY);
        isSaved = true;
    }

    //  初始化页面
    $(document).ready(function() {
        // 调用接口获取元素数据result
        var result = null;    // 可以导入数据
        if (result !== null) {
            initSavedData(result);
        }else {
            arrayWidth = 1000;
            arrayHeight = 1000;
        }
        drawChessBoard(); // 画棋盘
    });



    $(".rowCol").val("1");
    $(".direcType").html("<option value='1'>从左向右</option><option value='2'>从右向左</option>");
    //  横向竖向切换;
    $(".rowCol").on("change",function(){
        var val = $(this).val();
        var options = "";
        if(val == "1"){
            options += "<option value='1'>从左向右</option><option value='2'>从右向左</option>";
        }else if(val == "2"){
            options += "<option value='1'>从上向下</option><option value='2'>从下向上</option>";
        }
        $(".direcType").html(options);
    });

    //   保存绘画数据
    //保存
    $(".js-saveData").on("click", function () {
        changeMoreDeleteState();
        var saveArray = new Array();
        if (boundaryX === "" && boundaryY === "") {
            alert("请先设置边界！");
        }else if (doorX === "") {
            alert("请先设置大门！");
        }else {
            for (var i=0; i<boundaryY; i++) {
                saveArray[i] = new Array();
                for(var j=0; j<boundaryX; j++){
                    saveArray[i][j] = tArray[i][j];
                }
            }
            var param = {};
            param.warehouseId = warehouseId;
            param.doorX = doorX;
            param.doorY = doorY;
            param.areaPositions = saveArray;

            // 调用接口进行保存新增数据
            $.ajax.post("/add.json", param, function(res) {
                if (res !== null) {
                    initSavedData(res);
                }else {
                    tArray = saveArray;
                }

                $(".tipSuccess").removeClass("u-hidden");
                setTimeout(function () {
                    $(".tipSuccess").addClass("u-hidden");
                }, 1000);

            }, {isJson: true});
        }

    });


    //  取消新增区域

    $(".js-rebackSelect").on("click", function () {
        // drawChessBoard();
        $(".js-selectArea").modal("hide");
    });

    //  点击新增按钮
    /*点击添加*/
    $(".js-addData").on("click", function () {
        changeMoreDeleteState();
        if (addStarted) {
            $(".js-selectArea").modal("show");
            // addStarted = false;
            $("form", $(".js-selectArea")).trigger("reset");
        }else {
            alert("请先选择相应的区域！");
        }
        AREA_NAME_OBJ = new Object();
    });



    //  点击新增弹窗的确定按钮

    $(".js-confirm").on("click", function () {
        var areaName = $.trim($("input[name='selectName']").val());
        var setRow = $.trim($("input[name='startNumRow']").val());
        var setCol = $.trim($("input[name='startNumCol']").val());

        var rowCol = $(".rowCol").val();
        var direcType = $(".direcType").val();

        var nameType = rowCol + "-" + direcType;

        var startEnd = getAreaStartEnd(ADDAREA_LIST);

        if(areaName == ""){
            alert("请输入区域名称！");
            return false;
        }

        if(setRow == ""){
            alert("请填写库位起始行数！");
            return false;
        }

        if(setCol == ""){
            alert("请填写库位起始列数！");
            return false;
        }

        //  检验  区域编号是否有重复;
        for (var k=0; k<arrayWidth; k++) {
            for (var l=0; l< arrayHeight; l++) {
                if ( tArray[k][l] !== null && tArray[k][l].areaName == areaName.toUpperCase() ) {
                    flag = true;    //  区域编号 有重复
                }
            }
        }

        $(".js-selectArea").modal("hide");
        var nextIndexI = null, nextIndexJ = null;    //重复区域上一个区域开始位置连接下一个区域的数组位置;
        setRow = parseInt(setRow);
        setCol = parseInt(setCol);
        if(isSaved){
            arrangeArea(setRow, setCol, areaName, "isAdd", nameType, startEnd, flag);
        }else{
            arrangeArea(setRow, setCol, areaName, false, nameType, startEnd, flag);
        }

    });


    //排序 nextIndexI---  手动设置  nextIndexJ--- 目前默认是1;
    function arrangeArea(nextIndexI, nextIndexJ, areaName, operate, nameType, startEnd, flag){
        AREA_NAME_OBJ = new Object();
        var bol =  false;

        var startI = startEnd.startI;
        var startJ = startEnd.startJ;
        var endI = startEnd.endI;
        var endJ = startEnd.endJ;

        var addArray = JSON.parse(JSON.stringify(tArray));
        repeatX = nextIndexI;
        repeatY = nextIndexJ;

        if(flag){
            //  记录所有的区域名称编号;
            for (var i=0; i<arrayWidth; i++) {
                for (var j=0; j<arrayHeight; j++) {
                    if (addArray[i][j] !== null) {
                        AREA_NAME_OBJ[addArray[i][j].positionName] = addArray[i][j];
                    }
                }
            }
        }

        if(nameType == "1-1"){
            for (var x=startI; x<endI+1; x++) {
                repeatY = nextIndexJ;
                for (var y=startJ; y<endJ+1; y++) {
                    var positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                    if(flag){
                        if(AREA_NAME_OBJ.hasOwnProperty(positionName)){
                            bol = true;
                        }else{
                            addArray[x][y] = {};
                            addArray[x][y].positionName = positionName;
                            addArray[x][y].areaName = areaName.toUpperCase();
                            addArray[x][y].rowId = repeatX;
                            addArray[x][y].rowName = repeatX;
                            addArray[x][y].locationId = repeatY;
                            addArray[x][y].locationName = repeatY;
                            addArray[x][y].warehouseId = warehouseId;
                        }
                    }else{
                        addArray[x][y] = {};
                        addArray[x][y].positionName = positionName;
                        addArray[x][y].areaName = areaName.toUpperCase();
                        addArray[x][y].rowId = repeatX;
                        addArray[x][y].rowName = repeatX;
                        addArray[x][y].locationId = repeatY;
                        addArray[x][y].locationName = repeatY;
                        addArray[x][y].warehouseId = warehouseId;
                    }
                    repeatY++;
                }
                repeatX++;
            }
        }else if(nameType == "1-2"){
            for (var x=startI; x<endI+1; x++) {
                repeatY = nextIndexJ + startEnd.j-1;
                for (var y=startJ; y<endJ+1; y++) {
                    var positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                    if(flag){
                        if(AREA_NAME_OBJ.hasOwnProperty(positionName)){
                            bol = true;
                        }else {
                            addArray[x][y] = {};
                            addArray[x][y].positionName = positionName;
                            addArray[x][y].areaName = areaName.toUpperCase();
                            addArray[x][y].rowId = repeatX;
                            addArray[x][y].rowName = repeatX;
                            addArray[x][y].locationId = repeatY;
                            addArray[x][y].locationName = repeatY;
                            addArray[x][y].warehouseId = warehouseId;
                        }
                    }else{
                        addArray[x][y] = {};
                        addArray[x][y].positionName = positionName;
                        addArray[x][y].areaName = areaName.toUpperCase();
                        addArray[x][y].rowId = repeatX;
                        addArray[x][y].rowName = repeatX;
                        addArray[x][y].locationId = repeatY;
                        addArray[x][y].locationName = repeatY;
                        addArray[x][y].warehouseId = warehouseId;
                    }
                    repeatY--;
                }
                repeatX++;
            }
        }else if(nameType == "2-1"){
            repeatY = nextIndexJ;
            for (var x=startI; x<endI+1; x++) {
                repeatX = nextIndexI;
                for (var y=startJ; y<endJ+1; y++) {
                    var positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                    if(flag){
                        if(AREA_NAME_OBJ.hasOwnProperty(positionName)){
                            bol = true;
                        }else {
                            addArray[x][y] = {};
                            addArray[x][y].positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                            addArray[x][y].areaName = areaName.toUpperCase();
                            addArray[x][y].rowId = repeatX;
                            addArray[x][y].rowName = repeatX;
                            addArray[x][y].locationId = repeatY;
                            addArray[x][y].locationName = repeatY;
                            addArray[x][y].warehouseId = warehouseId;
                        }
                    }else{
                        addArray[x][y] = {};
                        addArray[x][y].positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                        addArray[x][y].areaName = areaName.toUpperCase();
                        addArray[x][y].rowId = repeatX;
                        addArray[x][y].rowName = repeatX;
                        addArray[x][y].locationId = repeatY;
                        addArray[x][y].locationName = repeatY;
                        addArray[x][y].warehouseId = warehouseId;
                    }
                    repeatX++;
                }
                repeatY++;
            }
        }else if(nameType == "2-2"){
            repeatY = nextIndexJ + startEnd.i-1;
            for (var x=startI; x<endI+1; x++) {
                repeatX = nextIndexI;
                for (var y=startJ; y<endJ+1; y++) {
                    var positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                    if(flag){
                        if(AREA_NAME_OBJ.hasOwnProperty(positionName)){
                            bol = true;
                        }else {
                            addArray[x][y] = {};
                            addArray[x][y].positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                            addArray[x][y].areaName = areaName.toUpperCase();
                            addArray[x][y].rowId = repeatX;
                            addArray[x][y].rowName = repeatX;
                            addArray[x][y].locationId = repeatY;
                            addArray[x][y].locationName = repeatY;
                            addArray[x][y].warehouseId = warehouseId;
                        }
                    }else{
                        addArray[x][y] = {};
                        addArray[x][y].positionName = areaName.toUpperCase() + "-" + repeatX + "-" + repeatY;
                        addArray[x][y].areaName = areaName.toUpperCase();
                        addArray[x][y].rowId = repeatX;
                        addArray[x][y].rowName = repeatX;
                        addArray[x][y].locationId = repeatY;
                        addArray[x][y].locationName = repeatY;
                        addArray[x][y].warehouseId = warehouseId;
                    }
                    repeatX++;
                }
                repeatY--;
            }
        }


        if(flag && bol){
            alert("重复编号已剔除！");
        }

        if (operate === "isAdd") {
            var param = {};
            param.warehouseId = warehouseId;
            param.doorX = doorX;
            param.doorY = doorY;
            param.areaPositions = addArray;

            // 调用接口更新数据
            $.ajax.post("/add.json", param, function(res) {
                if (res !== null) {
                    tArray = res.areaPositions;
                }else {
                    tArray = addArray;
                }
                drawChessBoard();
            }, {isJson: true});
        }else {
            tArray = addArray;
            drawChessBoard();
        }
        ADDAREA_LIST = [];
    }


    //   点击头部编辑按钮
    //修改
    $(".js-editVisual").on("click", function () {
        $(".js-modify").modal("show");
        $("form", $(".js-modify")).trigger("reset");
        changeMoreDeleteState();
    });

    //  点击编辑弹窗的确定按钮

    $(".js-confirmModify").on("click", function () {
        editArrayData();
    });


    function editArrayData() {
        var startArea = $("input[name='inputStart']").val();
        var modifyName = $("input[name='modifyName']").val();

        var rowsId = $("input[name='rowsId']").val();
        var colsId = $("input[name='colsId']").val();

        if (startArea === "") {
            alert("请输入当前库位编号！");
        }
        else if (modifyName === "") {
            alert("请输入当前库区编号！");
        }
        else if (rowsId === "") {
            alert("请输入库位排数！");
        }
        else if (colsId === "") {
            alert("请输入库位列数！");
        }else {
            rowsId = parseInt(rowsId);
            colsId = parseInt(colsId);
            var endArea =  modifyName.toUpperCase() + "-" + rowsId + "-" + colsId;
            var modifyX = null, modifyY = null;
            var enableModify = true;
            var item = {};

            for (var i=0; i<arrayWidth; i++) {
                for (var j=0; j<arrayHeight; j++) {
                    if(tArray[i][j] !== null && tArray[i][j].positionName === startArea){
                        modifyX = i;
                        modifyY = j;
                        item = tArray[i][j];
                    }
                    if(tArray[i][j] !== null && tArray[i][j].positionName === endArea){
                        enableModify = false;
                    }
                }
            }
            if ( modifyX === null || modifyY === null ) {
                alert ("您输入的起始位置有误！");
            }
            else if (!enableModify) {
                alert("您修改的编号有误！");
            }else {
                var editArray = [];
                item.positionName = endArea;
                item.areaName = modifyName.toUpperCase();
                item.rowId = rowsId;
                item.rowName = rowsId;
                item.locationId = colsId;
                item.locationName = colsId;
                editArray.push(item);
                $(".js-modify").modal("hide");

                if (isSaved) {
                    //调用接口更新数据
                    $.ajax.post("/update.json", {"areaPositions": editArray}, function(res) {
                        tArray[modifyX][modifyY] = res[0];
                        drawChessBoard();
                    }, {isJson: true});
                }else {
                    tArray[modifyX][modifyY].positionName = item.positionName;
                    tArray[modifyX][modifyY].areaName = item.areaName;
                    tArray[modifyX][modifyY].rowId = item.rowId;
                    tArray[modifyX][modifyY].rowName = item.rowName;
                    tArray[modifyX][modifyY].locationId = item.locationId;
                    tArray[modifyX][modifyY].locationName = item.locationName;
                    drawChessBoard();
                }
            }
        }

    }


    //   点击头部的删除按钮

    //批量删除
    $(".js-more-delete").on("click", function () {       //  2--批量删除开启状态，1---批量删除关闭状态
        // console.log($(this).attr("bol"));
        if($(this).attr("bol") == "1"){
            IS_MORE_DELETE_BOL = true;
            $(this).attr("bol","2");
            $(this).text("关闭删除");
        }else{
            IS_MORE_DELETE_BOL = false;
            $(this).attr("bol","1");
            $(this).text("开启删除");
        }
    });



    //删除
    $(".js-delete").on("click", function () {
        $(".js-showDelete").modal("show");
        $("form", $(".js-showDelete")).trigger("reset");

        changeMoreDeleteState();
    });

    function changeMoreDeleteState(){
        IS_MORE_DELETE_BOL = false;
        $(".js-more-delete").attr("bol","1");
        $(".js-more-delete").text("开启删除");
    }


    //  点击删除弹窗的确定按钮
    $(".js-deleteData").on("click", function () {
        var startArea = $("input[name='deleteStart']").val();
        var rows = parseInt($("input[name='deleteRows']").val());
        var cols = parseInt($("input[name='deleteCols']").val());
        var hasDelete = false;

        var modifyX = null, modifyY = null;
        var enableDelete = true;
        var hasCar = false;
        if (startArea != "" && rows != "" && cols != "") {
            for (var i=0; i<arrayWidth; i++) {
                for (var j=0; j<arrayHeight; j++) {
                    if(tArray[i][j] !== null && tArray[i][j].positionName === startArea){
                        modifyX = j;
                        modifyY = i;
                        hasDelete = true;
                    }
                }
            }

            if (hasDelete) {
                for (var x=modifyX; x<modifyX+cols; x++) {
                    for (var y=modifyY; y<modifyY+rows; y++) {
                        if (tArray[y][x] === null) {
                            enableDelete = false;
                        }
                        else {
                            if (tArray[y][x].hasCar) {
                                hasCar = true;
                            }
                        }
                    }
                }

                if (enableDelete) {
                    if (hasCar) {
                        alert("您删除的区域中有车辆停放的库位，请重新选择！");
                    }
                    else {
                        $(".js-showDelete").modal("hide");

                        var deleteArray = {};
                        deleteArray.warehouseId = warehouseId;
                        deleteArray.areaPositionIds = [];

                        for (var x=modifyX; x<modifyX+cols; x++) {
                            for (var y=modifyY; y<modifyY+rows; y++) {
                                deleteArray.areaPositionIds.push(tArray[y][x].areaPositionId);
                                //tArray[y][x] = null;
                            }
                        }

                        if (isSaved) {
                            // 调用接口更新数据
                            $.ajax.post("/delete.json", deleteArray, function(res) {
                                for (var x=modifyX; x<modifyX+cols; x++) {
                                    for (var y=modifyY; y<modifyY+rows; y++) {
                                        tArray[y][x] = null;
                                    }
                                }
                                drawChessBoard(); // 画棋盘
                            }, {isJson: true});
                        }
                        else {
                            for (var x=modifyX; x<modifyX+cols; x++) {
                                for (var y=modifyY; y<modifyY+rows; y++) {
                                    tArray[y][x] = null;
                                }
                            }
                            drawChessBoard(); // 画棋盘
                        }
                    }
                } else {
                    alert("您删除的区域中有未设置的库位，请重新选择！");
                }
            }
            else {
                alert("您选择的起始位置无对应库位！");
            }
        }
    });


    //中间添加横和列成功后的数据变化
    function insertedData(tArrays, insertNum) {
        tArray = tArrays;

        if ( $("input[name='insertArrange']:checked").val() == 1 ) {
            if (boundaryY !== "") {
                boundaryY = boundaryY + insertNum;
                if (doorX !== "") {
                    doorY = boundaryY + 1;
                }
            }
        }else if ( $("input[name='insertArrange']:checked").val() == 2 ) {
            if (boundaryX !== "") {
                boundaryX = boundaryX + insertNum;
            }
        }
        drawChessBoard();
    }



    /*中间添加行或列*/
    $(".js-insertData").on("click", function () {
        $(".js-insertStar").modal("show");
        $("form", $(".js-insertStar")).trigger("reset");

        changeMoreDeleteState();
    });

    $(".js-confirmInsert").on("click", function () {
        var insertStart = $("input[name='insertStart']").val();
        var insertStartRows = 0;
        var insertStartCols = 0;
        var insertNum = $(".insertNum").val();

        var arrWidth = arrayWidth;
        var arrHeight = arrayHeight;

        if (insertStart === "") {
            alert("请输入起始库位！");
        }else if (insertNum === "") {
            alert("请输入插入行数／列数！");
        }else {
            insertNum = parseInt(insertNum);

            for (var i=0; i<arrWidth; i++) {
                for(var j=0; j<arrHeight; j++){
                    if ( tArray[i] != undefined && tArray[i][j] != undefined && tArray[i][j] != null && tArray[i][j].positionName == insertStart) {
                        insertStartRows = i;
                        insertStartCols = j;
                    }
                }
            }

            var tArrays = new Array();
            if ( $("input[name='insertArrange']:checked").val() == 1 ) {
                arrWidth += insertNum;
                for (var i=0; i<arrWidth; i++) {
                    tArrays[i] = new Array();
                    for(j=0; j<arrHeight; j++){
                        tArrays[i][j] = null;
                    }
                }

                for (var i=0; i<insertStartRows+1; i++) {
                    for(j=0; j<arrHeight; j++){
                        tArrays[i][j] = tArray[i][j]
                    }
                }

                for (var i=insertStartRows+1; i<insertStartRows+ insertNum+1; i++) {
                    for (var j=0; j<arrHeight; j++) {
                        tArrays[i][j] = null;
                    }
                }

                for (var i=insertStartRows + insertNum+1; i<arrWidth; i++){
                    for (var j=0; j<arrHeight; j++) {
                        tArrays[i][j] = tArray[i-insertNum][j];
                    }
                }
            }
            else if ( $("input[name='insertArrange']:checked").val() == 2 ) {
                arrHeight += insertNum;
                for (var i=0; i<arrWidth; i++) {
                    tArrays[i] = new Array();
                    for(j=0; j<arrHeight; j++){
                        tArrays[i][j] = null;
                    }
                }
                for (var i=0; i<arrWidth; i++) {
                    for (var j=0; j<insertStartCols+1; j++) {
                        tArrays[i][j] = tArray[i][j];
                    }
                    for (var j=insertStartCols+1; j<insertStartCols + insertNum+1; j++) {
                        tArrays[i][j] = null;
                    }
                    for (var j=insertStartCols + insertNum+1; j<arrHeight; j++) {
                        tArrays[i][j] = tArray[i][j-insertNum];
                    }
                }
            }

            arrayWidth = arrWidth;
            arrayHeight = arrHeight;

            if (isSaved) {
                var param = {};
                param.warehouseId = warehouseId;
                param.doorX = doorX;
                param.doorY = boundaryY + insertNum + 1;
                param.areaPositions = tArrays;

                // 调用接口更新数据
                $.ajax.post("/update.json", param, function(res) {
                    if(res == "1003"){
                        drawChessBoard();
                        alert("插入库位失败！");
                    }else{
                        insertedData(tArrays, insertNum);
                    }
                }, {isJson: true});
            }
            else {
                insertedData(tArrays, insertNum);
            }
            $(".js-insertStar").modal("hide");
        }
    });


    /*设置大门*/
    $(".js-setDoor").on("click", function () {
        changeMoreDeleteState();
        if (boundaryX !== "" && boundaryY !== "") {
            if (isDoor) {
                isDoor = false;
                $(".js-tipDoor").addClass("u-hidden");
            }
            else {
                isDoor = true;
                $(".js-tipDoor").removeClass("u-hidden");
            }
        }
        else {
            alert("请先设置边界的位置！");
        }
    });


    //  获取横线和竖线的交叉点;
    function getLastIndex() {
        var lastIndex = {};
        for (var i=0; i<arrayWidth; i++) {
            for (var j=0; j<arrayHeight; j++) {
                if (tArray[i][j] !== null) {
                    lastIndex.row = i;
                }
            }
        }
        for (var i=0; i<arrayHeight; i++) {
            for (var j=0; j<arrayWidth; j++) {
                if (tArray[j][i] !== null) {
                    lastIndex.col = i;
                }
            }
        }
        return lastIndex;
    }

    //浏览模式
    $(".js-scanMode").on("click", function () {
        isScanMode = true;
        isEditMode = false;
        changeMoreDeleteState();
    });

    //编辑模式
    $(".js-editMode").on("click", function () {
        isEditMode = true;
        isScanMode = false;
        changeMoreDeleteState();
    });


    //设置边界
    $(".js-drawBoundary").on("click", function () {
        changeMoreDeleteState();
        if (isBoundary) {
            isBoundary = false;
            $(".js-tipLineX").addClass("u-hidden");
            $(".js-tipLineY").addClass("u-hidden");
            isBoundaryX = "";
            isBoundaryY = "";
            drawChessBoard();
        }else{
            isBoundary = true;
            $(".js-tipLineX").removeClass("u-hidden");
        }
    });



    //  画仓库范围;

    function confirmBoundary() {
        var saveArray = new Array();

        if (isBoundaryX !== "" && isBoundaryY !== "") {
            // console.log(getLastIndex());
            if ( (getLastIndex().row + 1) > isBoundaryY || (getLastIndex().col + 1) > isBoundaryX ) {
                alert("有库位在划定范围之外，请重新选择");
                isBoundaryX = "";
                isBoundaryY = "";
            }else {
                boundaryX = isBoundaryX;
                boundaryY = isBoundaryY;
                doorY = boundaryY + 1;
                isBoundaryX = "";
                isBoundaryY = "";
                if (isSaved) {
                    for (var i=0; i<boundaryY; i++) {
                        saveArray[i] = new Array();
                        for (var j=0; j<boundaryX; j++) {
                            saveArray[i][j] = null;
                        }
                    }
                    var saveX = 0, saveY = 0;
                    if (arrayWidth >= boundaryY) {
                        saveX = boundaryY;
                    }
                    else {
                        saveX = arrayWidth;
                    }
                    if (arrayHeight >= boundaryX) {
                        saveY = boundaryX;
                    }
                    else {
                        saveY = arrayHeight;
                    }

                    for (var i=0; i<saveX; i++) {
                        for (var j=0; j<saveY; j++) {
                            saveArray[i][j] = tArray[i][j];
                        }
                    }

                    var param = {};
                    param.warehouseId = warehouseId;
                    param.doorX = doorX;
                    param.doorY = doorY;
                    param.areaPositions = saveArray;

                    // 调用接口更新数据
                    $.ajax.post("/update.json", param, function(res) {
                        tArray = saveArray;
                        arrayWidth = boundaryY; arrayHeight = boundaryX;
                    }, {isJson: true});
                }
            }
            drawChessBoard();
        }
    }


    //画虚线
    function dotLine(dotLineIndex, type) {
        context.lineWidth = 4;
        context.strokeStyle = 'red';
        context.beginPath();
        context.setLineDash([5, 15]);
        if (type === "horizontal") {
            context.moveTo(dotLineIndex, 0);
            context.lineTo(dotLineIndex, 5000);
        }else {
            context.moveTo(0, dotLineIndex);
            context.lineTo(5000, dotLineIndex);
        }
        context.stroke();
    }

    //画虚线
    function dotLineThumb(dotLineIndex, type) {
        thumbContext.lineWidth = 1;
        thumbContext.strokeStyle = 'red';
        thumbContext.beginPath();
        thumbContext.setLineDash([5, 15]);
        if (type === "horizontal") {
            thumbContext.moveTo(dotLineIndex, 0);
            thumbContext.lineTo(dotLineIndex, 5000);
        }else {
            thumbContext.moveTo(0, dotLineIndex);
            thumbContext.lineTo(5000, dotLineIndex);
        }
        thumbContext.stroke();
    }

    //画删除框线
    function dotDeleteLine(startX, startY, endX, endY) {
        context.lineWidth = 2;
        context.strokeStyle = 'red';
        context.beginPath();
        // context.setLineDash([5, 15]);
        context.moveTo(startX-offsetX, startY-offsetY);
        context.lineTo(endX-offsetX, endY-offsetY);
        context.stroke();
    }

})();
