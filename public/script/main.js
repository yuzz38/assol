const swiper = new Swiper('.swiperMain', {
  // Optional parameters
  direction: 'horizontal',
  loop: true,
  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },

});

const swiperLicense = new Swiper('.swiperLicence', {
  // Optional parameters
  slidesPerView: 3, 
  autoHeight: true,
  spaceBetween: 30, 
  direction: 'horizontal',
  allowTouchMove: false,
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  breakpoints: {
    // when window width is >= 320px
    320: {
      slidesPerView: 1,
      spaceBetween: 20
    },
    // when window width is >= 480px
    480: {
      slidesPerView: 2,
      spaceBetween: 30
    },
    // when window width is >= 640px
    640: {
      slidesPerView: 3,
      spaceBetween: 40
    }
  }
});
const swiperPersonal = new Swiper('.swiperPersonal', {
  // Optional parameters
  slidesPerView: 4, 
  autoHeight: true,
  spaceBetween: 30, 
  direction: 'horizontal',
  allowTouchMove: false,
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  breakpoints: {
    // when window width is >= 320px
    320: {
      slidesPerView: 2,
      spaceBetween: 10
    },
    // when window width is >= 480px
    480: {
      slidesPerView: 3,
      spaceBetween: 15
    },
    // when window width is >= 640px
    640: {
      slidesPerView: 4,
      spaceBetween: 30
    }
  }
});

var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
      panel.style.padding = "0px 30px 0px 30px"
    } else {
      panel.style.maxHeight = panel.scrollHeight + 50 + "px";
      panel.style.padding = "0px 30px 30px 30px"
    }
  });
}
var header__nav = document.querySelector(".header__nav");
$("a#scroll").on("click", function(e) {
  $("html, body").animate({
    scrollTop: $($(this).attr("href")).offset().top
  }, 1000);
  $(header__nav).removeClass('open')

  return false;
});

if ($(window.location.hash).length > 1) {
  $("html, body").animate({
    scrollTop: $(window.location.hash).offset().top
  }, 1000);
}
var header_burger = document.querySelector(".header__burger");
$(header_burger).on("click", function(e) {
  
  $(header__nav).toggleClass('open');
});
